import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

// Strips internal/relational fields (ids, bike_id) that aren't useful
// outside the app, and flattens the rest into a plain CSV.
const SKIP_FIELDS = new Set(['id', 'bike_id', 'created_at'])

function toCSV(rows) {
  const fields = Object.keys(rows[0]).filter((f) => !SKIP_FIELDS.has(f))
  const escape = (val) => {
    if (val == null) return ''
    const s = String(val)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [
    fields.join(','),
    ...rows.map((row) => fields.map((f) => escape(row[f])).join(',')),
  ]
  return lines.join('\n')
}

/**
 * Exports rows to CSV. On the native Android/iOS app this writes the file
 * to app storage and opens the native share sheet (a plain browser-style
 * download doesn't work inside a Capacitor WebView). In a regular browser
 * it falls back to a normal file download.
 */
export async function exportToCSV(filename, rows) {
  if (!rows || rows.length === 0) return
  const csv = toCSV(rows)

  if (Capacitor.isNativePlatform()) {
    try {
      const result = await Filesystem.writeFile({
        path: filename,
        data: csv,
        directory: Directory.Cache,
        encoding: 'utf8',
      })
      await Share.share({
        title: filename,
        url: result.uri,
        dialogTitle: 'Export logbook',
      })
    } catch {
      // user cancelled the share sheet, or write failed — nothing else to do
    }
    return
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
