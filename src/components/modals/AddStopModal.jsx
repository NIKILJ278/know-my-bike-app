import { useEffect, useRef, useState } from 'react'
import Sheet from '../Sheet.jsx'
import RideMap from '../RideMap.jsx'
import { searchPlaces } from '../../lib/geocode'

export default function AddStopModal({ onClose, onAdd, presetCoords }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [pin, setPin] = useState(presetCoords || null)
  const [customLabel, setCustomLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const debounceRef = useRef(null)

  // Debounced search — searching on every keystroke was hammering the free
  // Nominatim API (it rate-limits aggressively), which is why searches
  // could silently go nowhere. Waiting for a pause in typing fixes that.
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); setSearching(false); return }
    setSearching(true)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await searchPlaces(query)
        setResults(r)
      } finally {
        // finally guarantees this always fires, even if the request
        // fails or throws, so the "Searching…" state can never get stuck.
        setSearching(false)
      }
    }, 450)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  const pickSearchResult = (r) => {
    setPin({ lat: r.lat, lng: r.lng })
    setCustomLabel(r.label.split(',')[0])
    setResults([])
    setQuery('')
  }

  const addStop = async () => {
    if (!pin || !customLabel.trim()) return
    setBusy(true)
    await onAdd({ label: customLabel.trim(), lat: pin.lat, lng: pin.lng })
    setBusy(false)
    onClose()
  }

  return (
    <Sheet title="Add a stop" subtitle="Search a place, or tap the map to drop a pin" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <input
          className="input"
          placeholder="Search a place — e.g. Nandi Hills"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus={!presetCoords}
        />

        {query.trim().length >= 2 && (
          <div className="flex flex-col -mt-2 max-h-48 overflow-y-auto">
            {searching && <p className="text-sm text-ink/40 dark:text-white/40 py-2">Searching…</p>}
            {!searching && results.map((r, i) => (
              <button
                key={i}
                onClick={() => pickSearchResult(r)}
                className="tap text-left py-2.5 border-b border-black/5 dark:border-white/10 last:border-0"
              >
                <p className="font-semibold text-sm truncate">{r.label}</p>
              </button>
            ))}
            {!searching && results.length === 0 && (
              <p className="text-sm text-ink/40 dark:text-white/40 py-2">No places found — tap the map below to drop a pin instead.</p>
            )}
          </div>
        )}

        <RideMap
          stops={pin ? [{ ...pin, label: customLabel || 'Pin' }] : []}
          onMapClick={(lat, lng) => { setPin({ lat, lng }); setResults([]); setQuery('') }}
          onLocate={(coords) => { setPin(coords); setCustomLabel((prev) => prev || 'My location') }}
          autoLocate={!presetCoords}
          height={200}
        />

        {pin && (
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="Label this spot — e.g. Lunch stop"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
            />
            <button
              disabled={busy || !customLabel.trim()}
              onClick={addStop}
              className="tap shrink-0 bg-amber text-ink font-semibold px-4 rounded-2xl disabled:opacity-50"
            >
              {busy ? '…' : 'Add'}
            </button>
          </div>
        )}
      </div>
    </Sheet>
  )
}
