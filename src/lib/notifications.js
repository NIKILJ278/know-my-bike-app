import { LocalNotifications } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'

// Deterministic small-int id from a UUID, since LocalNotifications needs
// numeric ids and we want re-scheduling the same document/reminder to
// update (not duplicate) its existing notification.
function idFor(uuid, salt) {
  let hash = 0
  const s = uuid + salt
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0
  return hash % 2000000000
}

const WARN_DAYS_BEFORE = 3

/**
 * Schedules a local notification a few days before each document's expiry
 * date and each reminder's due date. Runs entirely on-device — no backend
 * or push service needed, but it only fires while the OS keeps the app's
 * scheduled alarms alive (works even if the app is closed, on real Android
 * devices; some aggressive battery-saver modes can delay it).
 */
export async function scheduleExpiryNotifications(documents = [], reminders = []) {
  if (!Capacitor.isNativePlatform()) return // no-op outside the native app (e.g. browser preview)

  try {
    const perm = await LocalNotifications.requestPermissions()
    if (perm.display !== 'granted') return
  } catch {
    return
  }

  const now = new Date()
  const notifications = []

  documents.forEach((d) => {
    if (!d.expiry_date) return
    const due = new Date(d.expiry_date)
    const fireAt = new Date(due)
    fireAt.setDate(fireAt.getDate() - WARN_DAYS_BEFORE)
    if (fireAt <= now) return // already past the warning window
    notifications.push({
      id: idFor(d.id, 'doc'),
      title: `${d.doc_type} expiring soon`,
      body: `Renews in ${WARN_DAYS_BEFORE} days — check your Vault.`,
      schedule: { at: fireAt },
    })
  })

  reminders.forEach((r) => {
    if (!r.due_date || r.done) return
    const due = new Date(r.due_date)
    const fireAt = new Date(due)
    fireAt.setDate(fireAt.getDate() - WARN_DAYS_BEFORE)
    if (fireAt <= now) return
    notifications.push({
      id: idFor(r.id, 'rem'),
      title: r.title,
      body: `Due in ${WARN_DAYS_BEFORE} days.`,
      schedule: { at: fireAt },
    })
  })

  if (notifications.length) {
    try { await LocalNotifications.schedule({ notifications }) } catch { /* ignore */ }
  }
}
