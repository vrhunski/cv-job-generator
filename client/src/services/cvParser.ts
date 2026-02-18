export async function parseFile(file: File): Promise<{ text: string; fileName: string; photo?: string }> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch('/api/parse', {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(err.error || 'Failed to parse file')
  }

  return res.json()
}
