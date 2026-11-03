import { useMemo, useState } from 'react'
import Sheet from '../Sheet.jsx'
import DateField from '../DateField.jsx'
import { toInputDate, fromInputDate } from '../../lib/format'

const PURPOSES = ['Commute', 'Leisure', 'Touring', 'Off-road', 'Service run']

export default function LogTripModal({ bikeName, startOdometer = 0, onClose, onSave, initial }) {
  const isEdit = !!initial
  const [purpose, setPurpose] = useState(isEdit ? (initial.title?.split(' · ')[0] || 'Leisure') : 'Leisure')
  const [customTitle, setCustomTitle] = useState(initial?.title || '')
  const [startOdo, setStartOdo] = useState(startOdometer ? String(startOdometer) : '')
  const [endOdo, setEndOdo] = useState('')
  const [editDistance, setEditDistance] = useState(initial?.distance_km != null ? String(initial.distance_km) : '')
  const [duration, setDuration] = useState(initial?.duration_min != null ? String(initial.duration_min) : '')
  const [endPlace, setEndPlace] = useState(initial?.end_place || '')
  const [date, setDate] = useState(toInputDate(initial?.logged_at))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // For a new trip, distance is derived from the odometer delta instead of
  // asking the rider to type it separately. When editing an existing trip
  // we don't have its original start odometer stored, so distance is edited
  // directly there instead.
  const derivedDistance = useMemo(() => {
    const s = Number(startOdo), e = Number(endOdo)
    if (!s || !e || e <= s) return null
    return Math.round((e - s) * 10) / 10
  }, [startOdo, endOdo])

  const distance = isEdit ? Number(editDistance) || null : derivedDistance

  const submit = async (e) => {
    e.preventDefault()
    if (!distance) { setError(isEdit ? 'Enter a distance greater than 0.' : 'End odometer must be greater than start odometer.'); return }
    setError(''); setBusy(true)
    const title = customTitle.trim() || (endPlace ? `${purpose} · ${endPlace}` : purpose)
    const { error } = await onSave({
      title,
      distance_km: distance,
      duration_min: Number(duration) || null,
      start_place: null,
      end_place: endPlace || null,
      logged_at: fromInputDate(date, initial?.logged_at),
    })
    setBusy(false)
    if (error) return setError(error.message)
    onClose()
  }

  return (
    <Sheet title={isEdit ? 'Edit Trip' : 'Log Trip'} subtitle={`For ${bikeName}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <DateField value={date} onChange={setDate} />

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

        {isEdit ? (
          <Field label="Distance (km)">
            <input className="input" type="number" step="0.1" inputMode="decimal" value={editDistance} onChange={(e) => setEditDistance(e.target.value)} required />
          </Field>
        ) : (
          <>
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
          </>
        )}

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
        <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Trip'}</button>
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
