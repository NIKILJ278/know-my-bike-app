import { useState } from 'react'
import Sheet from '../Sheet.jsx'
import DateField from '../DateField.jsx'
import { toInputDate, fromInputDate } from '../../lib/format'

export default function LogFuelModal({ bikeName, onClose, onSave, initial, tankCapacity, onSaveTankCapacity }) {
  const [litres, setLitres] = useState(initial?.litres != null ? String(initial.litres) : '')
  const [amount, setAmount] = useState(initial?.amount != null ? String(initial.amount) : '')
  const [odometer, setOdometer] = useState(initial?.odometer_km != null ? String(initial.odometer_km) : '')
  const [fullTank, setFullTank] = useState(initial ? !!initial.full_tank : true)
  const [date, setDate] = useState(toInputDate(initial?.logged_at))
  const [tank, setTank] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const capacity = tankCapacity || Number(tank) || null
    if (!tankCapacity && !capacity) return setError('Please enter your fuel tank capacity.')
    if (capacity && Number(litres) > capacity) {
      return setError(`${litres} L is more than your tank capacity (${capacity} L). Check the litres, or the tank capacity.`)
    }
    setBusy(true)
    if (!tankCapacity && capacity && onSaveTankCapacity) await onSaveTankCapacity(capacity)
    const { error } = await onSave({
      litres: Number(litres),
      amount: Number(amount),
      odometer_km: Number(odometer),
      full_tank: fullTank,
      logged_at: fromInputDate(date, initial?.logged_at),
    })
    setBusy(false)
    if (error) return setError(error.message)
    onClose()
  }

  return (
    <Sheet title={initial ? "Edit Fuel Fill" : "Log Fuel"} subtitle={`For ${bikeName}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <DateField value={date} onChange={setDate} />
        {!tankCapacity && (
          <Field label="Fuel tank capacity (litres) *">
            <input className="input" type="number" step="0.1" min="0.5" max="100" inputMode="decimal" placeholder="11" value={tank} onChange={(e) => setTank(e.target.value)} required />
          </Field>
        )}
        <Field label="Litres *">
          <input className="input" type="number" step="0.01" inputMode="decimal" placeholder="8.0" value={litres} onChange={(e) => setLitres(e.target.value)} required />
        </Field>
        <Field label="Amount (₹) *">
          <input className="input" type="number" inputMode="numeric" placeholder="800" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </Field>
        <Field label="Odometer (km) *">
          <input className="input" type="number" inputMode="numeric" placeholder="8420" value={odometer} onChange={(e) => setOdometer(e.target.value)} required />
        </Field>

        <div className="card flex items-center justify-between px-4 py-4">
          <div>
            <p className="font-semibold">Full tank fill?</p>
            <p className="text-sm text-ink/50 dark:text-white/50">Enables mileage calculation.</p>
          </div>
          <Toggle checked={fullTank} onChange={setFullTank} />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save Changes' : 'Save Fill'}</button>
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

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-12 h-7 rounded-full relative tap transition-colors ${checked ? 'bg-amber' : 'bg-black/15 dark:bg-white/20'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  )
}
