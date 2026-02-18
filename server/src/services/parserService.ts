import pdf from 'pdf-parse'
import mammoth from 'mammoth'
import zlib from 'zlib'

export async function extractText(buffer: Buffer, mimetype: string): Promise<string> {
  if (mimetype === 'application/pdf') {
    const data = await pdf(buffer)
    return data.text
  }

  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimetype === 'application/msword'
  ) {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  throw new Error(`Unsupported file type: ${mimetype}`)
}

/**
 * Attempt to extract the first embedded photo from a CV file.
 * Returns a base64 data URL string, or null if no image found.
 */
export async function extractPhoto(buffer: Buffer, mimetype: string): Promise<string | null> {
  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimetype === 'application/msword'
  ) {
    return extractPhotoFromDocx(buffer)
  }

  if (mimetype === 'application/pdf') {
    return extractPhotoFromPdf(buffer)
  }

  return null
}

// ── DOCX ────────────────────────────────────────────────────────────────────

async function extractPhotoFromDocx(buffer: Buffer): Promise<string | null> {
  let photoDataUrl: string | null = null

  await mammoth.convertToHtml(
    { buffer },
    {
      convertImage: mammoth.images.imgElement((image) => {
        if (photoDataUrl === null) {
          return image.read().then((imgBuffer: Buffer) => {
            const base64 = imgBuffer.toString('base64')
            photoDataUrl = `data:${image.contentType};base64,${base64}`
            console.log(`[parserService] DOCX photo extracted: ${image.contentType}, ${imgBuffer.length} bytes`)
            return { src: photoDataUrl }
          })
        }
        return Promise.resolve({ src: '' })
      }),
    },
  )

  if (!photoDataUrl) {
    console.log('[parserService] DOCX: no embedded images found')
  }
  return photoDataUrl
}

// ── PDF ─────────────────────────────────────────────────────────────────────

function extractPhotoFromPdf(buffer: Buffer): string | null {
  // Strategy 1: FlateDecode RGB/Gray images (raw pixels compressed with zlib).
  // Most common format when exporting CVs from Word, LibreOffice, or online tools.
  const flatResult = extractFlatDecodeImage(buffer)
  if (flatResult) return flatResult

  // Strategy 2: DCTDecode streams (inline JPEG — no extra compression).
  const jpegResult = extractJpegFromPdfStreams(buffer)
  if (jpegResult) return jpegResult

  // Strategy 3: Raw JPEG binary scan (fallback for unusual PDF structures).
  return extractJpegBinaryScan(buffer)
}

/**
 * Find FlateDecode (zlib-compressed) image XObjects, decompress them,
 * and convert to PNG. Returns the largest qualifying image found.
 */
function extractFlatDecodeImage(buffer: Buffer): string | null {
  // Use latin1 so string indices == buffer byte offsets (1:1 mapping).
  const text = buffer.toString('latin1')

  // Match PDF image object dicts followed by "stream".
  // The lazy [\s\S]{0,1200}? avoids catastrophic backtracking on large dicts.
  const dictStreamPattern = /<<([\s\S]{0,1200}?\/Subtype\s*\/Image[\s\S]{0,1200}?)>>\s*stream\r?\n/g

  let bestPng: Buffer | null = null
  let bestPixels = 0

  for (const match of text.matchAll(dictStreamPattern)) {
    const dict = match[1]

    if (!dict.includes('FlateDecode')) continue

    // Only handle DeviceRGB (3 channels) or DeviceGray (1 channel).
    const isGray = dict.includes('DeviceGray')
    const isRgb = dict.includes('DeviceRGB')
    if (!isRgb && !isGray) continue

    const channels = isGray ? 1 : 3

    // Width and Height must be inline integers (not indirect references).
    const wMatch = dict.match(/\/Width\s+(\d+)/)
    const hMatch = dict.match(/\/Height\s+(\d+)/)
    if (!wMatch || !hMatch) continue

    const width = parseInt(wMatch[1], 10)
    const height = parseInt(hMatch[1], 10)

    // Skip very small images (icons, decorations) and unreasonably large ones.
    if (width < 50 || height < 50 || width * height > 8_000_000) continue

    // Only handle 8 bits per component (the default).
    const bpcMatch = dict.match(/\/BitsPerComponent\s+(\d+)/)
    if (bpcMatch && parseInt(bpcMatch[1], 10) !== 8) continue

    // Find the stream end by locating "\nendstream" after the stream start.
    const streamStart = (match.index ?? 0) + match[0].length
    const endMarker = buffer.indexOf(Buffer.from('\nendstream'), streamStart)
    if (endMarker < 0) continue

    const compressed = buffer.slice(streamStart, endMarker)

    // Decompress — try zlib inflate first, then raw deflate.
    let raw: Buffer
    try {
      raw = zlib.inflateSync(compressed)
    } catch {
      try {
        raw = zlib.inflateRawSync(compressed)
      } catch {
        continue
      }
    }

    const expectedSize = width * height * channels
    if (raw.length !== expectedSize) continue

    const pixels = width * height
    if (pixels <= bestPixels) continue

    bestPixels = pixels
    bestPng = isGray ? grayToPng(width, height, raw) : rgbToPng(width, height, raw)
  }

  if (!bestPng) {
    console.log('[parserService] PDF: no FlateDecode image found')
    return null
  }

  console.log(`[parserService] PDF photo extracted via FlateDecode → PNG, ${bestPixels} pixels`)
  return `data:image/png;base64,${bestPng.toString('base64')}`
}

/** Find DCTDecode (JPEG) image streams using the dict's inline /Length value. */
function extractJpegFromPdfStreams(buffer: Buffer): string | null {
  const text = buffer.toString('latin1')
  const dictStreamPattern = /<<([\s\S]{0,800}?)>>\s*stream\r?\n/g

  let bestData: Buffer | null = null
  let bestSize = 0

  for (const match of text.matchAll(dictStreamPattern)) {
    const dict = match[1]
    if (!dict.includes('/Image')) continue
    if (!dict.includes('DCTDecode') && !dict.includes('DCT')) continue

    // Skip indirect length references like "42 0 R".
    const lengthMatch = dict.match(/\/Length\s+(\d+)\b(?!\s*\d+\s*R)/)
    if (!lengthMatch) continue

    const length = parseInt(lengthMatch[1], 10)
    if (length < 2048 || length > 20 * 1024 * 1024) continue

    const streamStart = (match.index ?? 0) + match[0].length
    if (streamStart + length > buffer.length) continue

    const imgBuffer = buffer.slice(streamStart, streamStart + length)
    if (imgBuffer[0] !== 0xff || imgBuffer[1] !== 0xd8) continue

    if (length > bestSize) {
      bestSize = length
      bestData = imgBuffer
    }
  }

  if (!bestData) {
    console.log('[parserService] PDF: no DCTDecode stream found')
    return null
  }

  console.log(`[parserService] PDF photo extracted via DCTDecode: JPEG, ${bestSize} bytes`)
  return `data:image/jpeg;base64,${bestData.toString('base64')}`
}

/** Last-resort: scan for literal JPEG SOI/EOI byte sequences. */
function extractJpegBinaryScan(buffer: Buffer): string | null {
  let bestStart = -1
  let bestEnd = -1
  let bestSize = 0

  let i = 0
  while (i < buffer.length - 2) {
    if (buffer[i] === 0xff && buffer[i + 1] === 0xd8 && buffer[i + 2] === 0xff) {
      const start = i
      let j = start + 4
      while (j < buffer.length - 1) {
        if (buffer[j] === 0xff && buffer[j + 1] === 0xd9) {
          const size = j + 2 - start
          if (size > bestSize) {
            bestSize = size
            bestStart = start
            bestEnd = j + 2
          }
          break
        }
        j++
      }
      i = j + 1
    } else {
      i++
    }
  }

  if (bestStart === -1 || bestSize < 2048) {
    console.log('[parserService] PDF: no JPEG found via binary scan either')
    return null
  }

  console.log(`[parserService] PDF photo extracted via binary scan: JPEG, ${bestSize} bytes`)
  return `data:image/jpeg;base64,${buffer.slice(bestStart, bestEnd).toString('base64')}`
}

// ── PNG builder (pure Node.js, no extra dependencies) ───────────────────────

function rgbToPng(width: number, height: number, rgb: Buffer): Buffer {
  const rowSize = width * 3
  // Prepend filter byte 0x00 (None) to each row — required by PNG spec.
  const filtered = Buffer.alloc((rowSize + 1) * height)
  for (let y = 0; y < height; y++) {
    filtered[y * (rowSize + 1)] = 0
    rgb.copy(filtered, y * (rowSize + 1) + 1, y * rowSize, (y + 1) * rowSize)
  }
  return buildPng(width, height, 2 /* RGB */, zlib.deflateSync(filtered))
}

function grayToPng(width: number, height: number, gray: Buffer): Buffer {
  const filtered = Buffer.alloc((width + 1) * height)
  for (let y = 0; y < height; y++) {
    filtered[y * (width + 1)] = 0
    gray.copy(filtered, y * (width + 1) + 1, y * width, (y + 1) * width)
  }
  return buildPng(width, height, 0 /* Grayscale */, zlib.deflateSync(filtered))
}

function buildPng(width: number, height: number, colorType: number, idatData: Buffer): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  const ihdrPayload = Buffer.alloc(13)
  ihdrPayload.writeUInt32BE(width, 0)
  ihdrPayload.writeUInt32BE(height, 4)
  ihdrPayload[8] = 8          // bit depth: 8
  ihdrPayload[9] = colorType  // 0=Gray, 2=RGB
  // bytes 10-12 remain 0 (deflate compression, adaptive filter, no interlace)

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdrPayload),
    pngChunk('IDAT', idatData),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0)
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf])
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    let b = (crc ^ data[i]) & 0xff
    for (let k = 0; k < 8; k++) {
      b = b & 1 ? (0xedb88320 ^ (b >>> 1)) : (b >>> 1)
    }
    crc = (crc >>> 8) ^ b
  }
  return (crc ^ 0xffffffff) >>> 0
}
