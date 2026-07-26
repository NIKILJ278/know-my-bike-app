import { useState } from 'react'
import Sheet from '../Sheet.jsx'

export default function InviteMemberModal({ onClose, onInvite }) {
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setSuccess(''); setBusy(true)
    const { error, data } = await onInvite(query.trim())
    setBusy(false)
    if (error) return setError(error.message)
    setSuccess(`Invited ${data?.username || 'rider'}!`)
    setQuery('')
  }

  return (
    <Sheet title="Invite a rider" subtitle="By phone number or their Know My Bike invite code" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <input
          className="input"
          placeholder="Phone number or invite code (e.g. K7B2XQ)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <p className="text-xs text-ink/40 dark:text-white/40 -mt-2">
          They need the app and must have added their phone number, or shared their invite code from their Profile screen.
        </p>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-600 dark:text-green-400">{success}</p>}
        <button className="btn-primary" disabled={busy || !query.trim()}>{busy ? 'Inviting…' : 'Send Invite'}</button>
      </form>
    </Sheet>
  )
}
