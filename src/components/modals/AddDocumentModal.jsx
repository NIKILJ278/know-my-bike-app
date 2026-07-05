import { useState } from 'react'
import Sheet from '../Sheet.jsx'

export const DOC_TYPES = ['Insurance', 'RC', 'PUC', 'License', 'Other']

export default function AddDocumentModal({ bikeName, onClose, onSave }) {
  const [type, setType] = useState('Insurance')
  const [number, setNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    const { error } = await onSave({ doc_type: type, doc_number: number, expiry_date: expiry || null })
    setBusy(false)
    if (error) return setError(error.message)
    onClose()
  }

  return (
    <Sheet title="Add Document" subtitle={`For ${bikeName}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
          {DOC_TYPES.map((t) => (
            <button type="button" key={t} onClick={() => setType(t)}
              className={`chip ${type === t ? 'bg-ink text-white border-ink dark:bg-white dark:text-ink dark:border-white' : 'border-black/10 dark:border-white/15'}`}>
              {t}
            </button>
          ))}
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/70 dark:text-white/70 mb-2">Document / policy number</label>
          <input className="input" placeholder="POLI-88123" value={number} onChange={(e) => setNumber(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/70 dark:text-white/70 mb-2">Expiry date</label>
          <input className="input" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save Document'}</button>
      </form>
    </Sheet>
  )
}
