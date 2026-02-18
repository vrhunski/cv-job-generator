import express from 'express'
import cors from 'cors'
import parseRouter from './routes/parse'
import pdfRouter from './routes/pdf'
import aiRouter from './routes/ai'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '50mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/parse', parseRouter)
app.use('/api/pdf', pdfRouter)
app.use('/api/ai', aiRouter)

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

// Let ts-node-dev restart cleanly without EADDRINUSE
process.on('SIGTERM', () => server.close())
process.on('SIGINT', () => server.close())

export default app
