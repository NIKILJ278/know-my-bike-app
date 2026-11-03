import { todayInputValue } from '../lib/format'

export default function DateField({ value, onChange, label = 'Date *' }) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink/70 dark:text-white/70 mb-2">{label}</label>
      <input
        className="input"
        type="date"
        value={value}
        max={todayInputValue()}
        onChange={(e) => onChange(e.target.value)}
        required
      />
    </div>
  )
}
