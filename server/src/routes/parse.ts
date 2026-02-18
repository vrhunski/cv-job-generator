import { Router } from 'express'
import multer from 'multer'
import { extractText, extractPhoto } from '../services/parserService'

const router = Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ]
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Only PDF and DOCX files are supported'))
    }
  },
})

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const [text, photo] = await Promise.all([
      extractText(req.file.buffer, req.file.mimetype),
      extractPhoto(req.file.buffer, req.file.mimetype),
    ])

    res.json({
      text,
      photo: photo ?? undefined,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
    })
  } catch (err: any) {
    console.error('Parse error:', err)
    res.status(500).json({ error: err.message || 'Failed to parse file' })
  }
})

export default router
