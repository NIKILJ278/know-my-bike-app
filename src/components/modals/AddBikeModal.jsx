import { useState } from 'react'
import Sheet from '../Sheet.jsx'

export default function AddBikeModal({ onClose, onSave }) {
  const [name, setName] = useState('')
  const [make, setMake] = useState('')
  const [odometer, setOdometer] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    const { error } = await onSave({
      name, make, odometer_km: Number(odometer) || 0,
    })
    setBusy(false)
    if (error) return setError(error.message)
    onClose()
  }

  return (
    <Sheet title="Add a bike" subtitle="Add another ride to your garage" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <input className="input" placeholder="Nickname — e.g. My Yamaha R15" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="input" placeholder="Make & model — e.g. Yamaha R15 V4" value={make} onChange={(e) => setMake(e.target.value)} />
        <input className="input" type="number" inputMode="numeric" placeholder="Current odometer (km)" value={odometer} onChange={(e) => setOdometer(e.target.value)} />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button className="btn-primary mt-2" disabled={busy}>{busy ? 'Saving…' : 'Add to garage'}</button>
      </form>
    </Sheet>
  )
}
