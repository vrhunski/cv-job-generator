const MIGRATION_KEY = 'cv-ls-migrated-v2'

export async function migrateFromLocalStorage() {
  if (localStorage.getItem(MIGRATION_KEY)) return  // already done

  const profileRaw = localStorage.getItem('cv-profile')
  const appsRaw = localStorage.getItem('cv-applications')

  if (!profileRaw && !appsRaw) {
    localStorage.setItem(MIGRATION_KEY, '1')
    return
  }

  try {
    if (profileRaw) {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: profileRaw,
      })
      console.log('[migrate] CVProfile imported from localStorage')
    }

    if (appsRaw) {
      const apps = JSON.parse(appsRaw) as any[]
      for (const app of apps) {
        await fetch('/api/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company: app.company,
            jobTitle: app.jobTitle,
            appliedDate: app.appliedDate,
            status: app.status,
            notes: app.notes,
            senderEmail: app.senderEmail,
            sessionId: app.sessionId,
          }),
        })
      }
      console.log(`[migrate] ${apps.length} applications imported from localStorage`)
    }

    localStorage.setItem(MIGRATION_KEY, '1')
  } catch (err) {
    console.warn('[migrate] localStorage migration failed:', err)
  }
}
