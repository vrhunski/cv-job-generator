import express from 'express'
import cors from 'cors'
import { runMigrations } from './db/migrate'
import parseRouter from './routes/parse'
import pdfRouter from './routes/pdf'
import aiRouter from './routes/ai'
import mailRouter from './routes/mail'
import profileRouter from './routes/profile'
import applicationsRouter from './routes/applications'

// Run DB migrations before accepting requests
runMigrations()

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
app.use('/api/mail', mailRouter)
app.use('/api/profile', profileRouter)
app.use('/api/applications', applicationsRouter)

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

// Let ts-node-dev restart cleanly without EADDRINUSE
process.on('SIGTERM', () => server.close())
process.on('SIGINT', () => server.close())

export default app
