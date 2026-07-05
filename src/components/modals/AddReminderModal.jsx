import { useState } from 'react'
import Sheet from '../Sheet.jsx'

export default function AddReminderModal({ bikeName, onClose, onSave }) {
  const [title, setTitle] = useState('')
  const [dueType, setDueType] = useState('date') // 'date' | 'km'
  const [dueDate, setDueDate] = useState('')
  const [dueKm, setDueKm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    const { error } = await onSave({
      title,
      due_date: dueType === 'date' ? dueDate || null : null,
      due_km: dueType === 'km' ? Number(dueKm) || null : null,
    })
    setBusy(false)
    if (error) return setError(error.message)
    onClose()
  }

  return (
    <Sheet title="Add Reminder" subtitle={`For ${bikeName}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <div>
          <label className="block text-sm font-medium text-ink/70 dark:text-white/70 mb-2">What's due? *</label>
          <input className="input" placeholder="Engine Oil Change" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={() => setDueType('date')} className={`chip ${dueType === 'date' ? 'bg-ink text-white border-ink dark:bg-white dark:text-ink dark:border-white' : 'border-black/10 dark:border-white/15'}`}>By date</button>
          <button type="button" onClick={() => setDueType('km')} className={`chip ${dueType === 'km' ? 'bg-ink text-white border-ink dark:bg-white dark:text-ink dark:border-white' : 'border-black/10 dark:border-white/15'}`}>By odometer</button>
        </div>

        {dueType === 'date' ? (
          <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        ) : (
          <input className="input" type="number" inputMode="numeric" placeholder="Due at 9500 km" value={dueKm} onChange={(e) => setDueKm(e.target.value)} />
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}
        <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save Reminder'}</button>
      </form>
    </Sheet>
  )
}
