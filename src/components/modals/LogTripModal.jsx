import { useState } from 'react'
import Sheet from '../Sheet.jsx'

export default function LogTripModal({ bikeName, onClose, onSave }) {
  const [title, setTitle] = useState('')
  const [distance, setDistance] = useState('')
  const [duration, setDuration] = useState('')
  const [startPlace, setStartPlace] = useState('')
  const [endPlace, setEndPlace] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    const { error } = await onSave({
      title, distance_km: Number(distance), duration_min: Number(duration) || null,
      start_place: startPlace, end_place: endPlace, logged_at: new Date().toISOString(),
    })
    setBusy(false)
    if (error) return setError(error.message)
    onClose()
  }

  return (
    <Sheet title="Log Trip" subtitle={`For ${bikeName}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <Field label="Trip title *">
          <input className="input" placeholder="Sunday ride to Nandi Hills" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </Field>
        <Field label="Distance (km) *">
          <input className="input" type="number" inputMode="decimal" placeholder="120" value={distance} onChange={(e) => setDistance(e.target.value)} required />
        </Field>
        <Field label="Duration (min)">
          <input className="input" type="number" inputMode="numeric" placeholder="150" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </Field>
        <Field label="Start place">
          <input className="input" placeholder="Bengaluru" value={startPlace} onChange={(e) => setStartPlace(e.target.value)} />
        </Field>
        <Field label="End place">
          <input className="input" placeholder="Nandi Hills" value={endPlace} onChange={(e) => setEndPlace(e.target.value)} />
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
