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
