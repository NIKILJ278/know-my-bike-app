import { useState } from 'react'
import Sheet from '../Sheet.jsx'
import DateField from '../DateField.jsx'
import { toInputDate, fromInputDate } from '../../lib/format'

export const EXPENSE_CATEGORIES = ['Service', 'Repair', 'Insurance', 'Accessories', 'Other']

export default function LogExpenseModal({ bikeName, onClose, onSave, initial }) {
  const [category, setCategory] = useState(initial?.category || 'Service')
  const [amount, setAmount] = useState(initial?.amount != null ? String(initial.amount) : '')
  const [note, setNote] = useState(initial?.note || '')
  const [date, setDate] = useState(toInputDate(initial?.logged_at))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    const { error } = await onSave({
      category, amount: Number(amount), note,
      logged_at: fromInputDate(date, initial?.logged_at),
    })
    setBusy(false)
    if (error) return setError(error.message)
    onClose()
  }

  return (
    <Sheet title={initial ? "Edit Expense" : "Log Expense"} subtitle={`For ${bikeName}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
          {EXPENSE_CATEGORIES.map((c) => (
            <button
              type="button" key={c} onClick={() => setCategory(c)}
              className={`chip ${category === c ? 'bg-ink text-white border-ink dark:bg-white dark:text-ink dark:border-white' : 'border-black/10 dark:border-white/15'}`}
            >{c}</button>
          ))}
        </div>

        <DateField value={date} onChange={setDate} />

        <div>
          <label className="block text-sm font-medium text-ink/70 dark:text-white/70 mb-2">Amount (₹) *</label>
          <input className="input" type="number" inputMode="numeric" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink/70 dark:text-white/70 mb-2">Note (optional)</label>
          <input className="input" placeholder="What was this for?" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save Changes' : 'Save Expense'}</button>
      </form>
    </Sheet>
  )
}
