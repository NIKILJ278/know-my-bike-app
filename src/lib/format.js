export function formatINR(n) {
  const num = Number(n) || 0
  return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

export function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

export function daysUntil(iso) {
  if (!iso) return null
  const diff = new Date(iso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)
  return Math.round(diff / 86400000)
}

// ---- Manual log dates -------------------------------------------------
// <input type="date"> works with local "YYYY-MM-DD" strings, while the
// database stores a timestamptz. These helpers convert between the two
// without the off-by-one-day bug you get from toISOString() near midnight.
const pad = (n) => String(n).padStart(2, '0')

export function todayInputValue() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function toInputDate(iso) {
  if (!iso) return todayInputValue()
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Turn the picked date back into an ISO timestamp. If the date is unchanged
// from the original log, keep the original timestamp; if it's today, use the
// current time (so same-day logs stay in order); otherwise use local noon.
export function fromInputDate(value, originalIso) {
  if (!value) return originalIso || new Date().toISOString()
  if (originalIso && toInputDate(originalIso) === value) return originalIso
  const [y, m, d] = value.split('-').map(Number)
  const now = new Date()
  if (value === todayInputValue()) return now.toISOString()
  return new Date(y, m - 1, d, 12, 0, 0).toISOString()
}
