import { useState } from 'react'
import Sheet from '../Sheet.jsx'
import { searchPlaces } from '../../lib/geocode'

export default function AddStopModal({ onClose, onAdd, presetCoords }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [customLabel, setCustomLabel] = useState('')
  const [busy, setBusy] = useState(false)

  const runSearch = async (q) => {
    setQuery(q)
    if (q.trim().length < 3) { setResults([]); return }
    setSearching(true)
    const r = await searchPlaces(q)
    setResults(r)
    setSearching(false)
  }

  const addStop = async (stop) => {
    setBusy(true)
    await onAdd(stop)
    setBusy(false)
    onClose()
  }

  return (
    <Sheet title="Add a stop" subtitle="Search a place, or use the pin you dropped" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {presetCoords ? (
          <div className="card p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold">Dropped pin</p>
              <p className="text-xs text-ink/50 dark:text-white/50 truncate">{presetCoords.lat.toFixed(4)}, {presetCoords.lng.toFixed(4)}</p>
            </div>
          </div>
        ) : null}

        {presetCoords ? (
          <div className="flex gap-2">
            <input className="input" placeholder="Label this spot — e.g. Lunch stop" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} autoFocus />
            <button
              disabled={busy || !customLabel.trim()}
              onClick={() => addStop({ label: customLabel.trim(), lat: presetCoords.lat, lng: presetCoords.lng })}
              className="tap shrink-0 bg-amber text-ink font-semibold px-4 rounded-2xl disabled:opacity-50"
            >
              Add
            </button>
          </div>
        ) : (
          <input className="input" placeholder="Search a place — e.g. Nandi Hills" value={query} onChange={(e) => runSearch(e.target.value)} autoFocus />
        )}

        {!presetCoords && (
          <div className="flex flex-col">
            {searching && <p className="text-sm text-ink/40 dark:text-white/40 py-2">Searching…</p>}
            {!searching && results.map((r, i) => (
              <button
                key={i}
                disabled={busy}
                onClick={() => addStop({ label: r.label, lat: r.lat, lng: r.lng })}
                className="tap text-left py-3 border-b border-black/5 dark:border-white/10 last:border-0"
              >
                <p className="font-semibold text-sm truncate">{r.label}</p>
              </button>
            ))}
            {!searching && query.trim().length >= 3 && results.length === 0 && (
              <p className="text-sm text-ink/40 dark:text-white/40 py-2">No places found — try a different search, or close this and tap directly on the map to drop a pin.</p>
            )}
          </div>
        )}
      </div>
    </Sheet>
  )
}
