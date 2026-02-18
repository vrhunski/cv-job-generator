import { ImapFlow } from 'imapflow'

export interface RawEmail {
  subject: string
  senderName: string
  senderEmail: string
  date: string // YYYY-MM-DD
}

export interface ParsedEmail {
  company: string | null
  jobTitle: string | null
  date: string | null
  senderEmail: string | null
  raw: string // subject line for display
}

export interface BridgeConfig {
  host: string
  port: number
  username: string
  password: string
  folder: string
}

export async function listFolders(config: Omit<BridgeConfig, 'folder'>): Promise<string[]> {
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: false,
    tls: { rejectUnauthorized: false },
    auth: { user: config.username, pass: config.password },
    logger: false,
  })

  await client.connect()

  try {
    const list = await client.list()
    return list.map((m) => m.path).sort()
  } finally {
    try { await client.logout() } catch {}
  }
}

export async function fetchJobEmails(config: BridgeConfig): Promise<RawEmail[]> {
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: false, // Bridge uses STARTTLS on port 1143
    tls: {
      rejectUnauthorized: false, // Bridge uses a self-signed cert
    },
    auth: {
      user: config.username,
      pass: config.password,
    },
    logger: false,
  })

  await client.connect() // throws with err.code = ECONNREFUSED if Bridge is not running

  const emails: RawEmail[] = []

  try {
    await client.mailboxOpen(config.folder)

    for await (const message of client.fetch('1:*', { envelope: true })) {
      const env = message.envelope
      const from = env.from?.[0]
      const rawDate = env.date ? new Date(env.date) : null
      const dateStr = rawDate
        ? rawDate.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]

      emails.push({
        subject: env.subject || '',
        senderName: from?.name || '',
        senderEmail: from?.address || '',
        date: dateStr,
      })
    }
  } finally {
    // Swallow logout errors — they must not mask the original error
    try { await client.logout() } catch {}
  }

  return emails
}
