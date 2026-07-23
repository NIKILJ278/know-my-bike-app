import { useMemo, useState } from 'react'
import Sheet from '../Sheet.jsx'

const PURPOSES = ['Commute', 'Leisure', 'Touring', 'Off-road', 'Service run']

export default function LogTripModal({ bikeName, startOdometer = 0, onClose, onSave }) {
  const [purpose, setPurpose] = useState('Leisure')
  const [customTitle, setCustomTitle] = useState('')
  const [startOdo, setStartOdo] = useState(startOdometer ? String(startOdometer) : '')
  const [endOdo, setEndOdo] = useState('')
  const [duration, setDuration] = useState('')
  const [endPlace, setEndPlace] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Distance is derived from the odometer delta instead of asking the
  // rider to type it separately — one less number to get wrong, and it
  // keeps the trip distance consistent with the bike's actual odometer.
  const distance = useMemo(() => {
    const s = Number(startOdo), e = Number(endOdo)
    if (!s || !e || e <= s) return null
    return Math.round((e - s) * 10) / 10
  }, [startOdo, endOdo])

  const submit = async (e) => {
    e.preventDefault()
    if (!distance) { setError('End odometer must be greater than start odometer.'); return }
    setError(''); setBusy(true)
    const title = customTitle.trim() || (endPlace ? `${purpose} · ${endPlace}` : purpose)
    const { error } = await onSave({
      title,
      distance_km: distance,
      duration_min: Number(duration) || null,
      start_place: null,
      end_place: endPlace || null,
      logged_at: new Date().toISOString(),
    })
    setBusy(false)
    if (error) return setError(error.message)
    onClose()
  }

  return (
    <Sheet title="Log Trip" subtitle={`For ${bikeName}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <Field label="Purpose">
          <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
            {PURPOSES.map((p) => (
              <button type="button" key={p} onClick={() => setPurpose(p)}
                className={`chip shrink-0 ${purpose === p ? 'bg-ink text-white border-ink dark:bg-white dark:text-ink dark:border-white' : 'border-black/10 dark:border-white/15'}`}>
                {p}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start odometer (km)">
            <input className="input" type="number" inputMode="numeric" value={startOdo} onChange={(e) => setStartOdo(e.target.value)} required />
          </Field>
          <Field label="End odometer (km)">
            <input className="input" type="number" inputMode="numeric" placeholder="e.g. 992" value={endOdo} onChange={(e) => setEndOdo(e.target.value)} required />
          </Field>
        </div>

        <div className="card px-4 py-3.5 flex items-center justify-between">
          <span className="text-sm font-semibold text-ink/60 dark:text-white/60">Distance (auto-calculated)</span>
          <span className="font-display font-extrabold text-lg">{distance ? `${distance} km` : '—'}</span>
        </div>

        <Field label="Where did you end up? (optional)">
          <input className="input" placeholder="Nandi Hills" value={endPlace} onChange={(e) => setEndPlace(e.target.value)} />
        </Field>

        <Field label="Duration in minutes (optional)">
          <input className="input" type="number" inputMode="numeric" placeholder="150" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </Field>

        <Field label="Custom title (optional — we'll suggest one otherwise)">
          <input className="input" placeholder={endPlace ? `${purpose} · ${endPlace}` : purpose} value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} />
        </Field>

        {error && <p className="text-sm text-red-500">{error}</p>}
        <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save Trip'}</button>
      </form>
    </Sheet>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink/70 dark:text-white/70 mb-2">{label}</label>
      {children}
    </div>
  )
}
