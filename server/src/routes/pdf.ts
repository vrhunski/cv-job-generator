import { Router } from 'express'
import { generatePdf, generateHtml } from '../services/pdfGenerator'
import type { CVProfile } from '../../../shared/types'

const router = Router()

router.post('/', async (req, res) => {
  try {
    const profile: CVProfile = req.body

    if (!profile || !profile.fullName) {
      return res.status(400).json({ error: 'Invalid CV profile data' })
    }

    const pdfBuffer = await generatePdf(profile)

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${profile.fullName.replace(/\s+/g, '_')}_CV.pdf"`,
      'Content-Length': pdfBuffer.length.toString(),
    })

    res.send(pdfBuffer)
  } catch (err: any) {
    console.error('PDF generation error:', err)
    res.status(500).json({ error: err.message || 'Failed to generate PDF' })
  }
})

router.post('/html', async (req, res) => {
  try {
    const profile: CVProfile = req.body

    if (!profile || !profile.fullName) {
      return res.status(400).json({ error: 'Invalid CV profile data' })
    }

    const html = await generateHtml(profile)
    res.set('Content-Type', 'text/html')
    res.send(html)
  } catch (err: any) {
    console.error('HTML generation error:', err)
    res.status(500).json({ error: err.message || 'Failed to generate HTML' })
  }
})

export default router
