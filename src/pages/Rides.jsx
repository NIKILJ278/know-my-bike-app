import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRides } from '../hooks/useRides'
import Sheet from '../components/Sheet.jsx'
import Fab from '../components/Fab.jsx'
import { formatDate } from '../lib/format'

const STATUS_TINT = {
  planning: 'bg-pastel-blue text-blue-900',
  active: 'bg-pastel-green text-green-900',
  ended: 'bg-surface-muted dark:bg-surface-darkmuted text-ink/50 dark:text-white/50',
}

export default function Rides() {
  const { rides, loading, startRide } = useRides()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setFormError('')
    const { data, error } = await startRide(name.trim() || 'Group Ride')
    setBusy(false)
    if (!error && data) navigate(`/rides/${data.id}`)
    else if (error) setFormError(error.message || 'Could not start the ride. Please try again.')
  }

  return (
    <div className="px-6 pt-14">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-extrabold">Ride</h1>
        <p className="text-ink/50 dark:text-white/50">Plan a route, invite riders, stay connected.</p>
      </div>

      {!loading && rides.length === 0 && (
        <div className="flex flex-col items-center text-center py-16">
          <div className="w-20 h-20 rounded-full bg-surface-muted dark:bg-surface-darkmuted flex items-center justify-center text-3xl mb-4">🏍️</div>
          <p className="font-bold text-lg mb-1">No rides yet</p>
          <p className="text-ink/50 dark:text-white/50 mb-6">Start a ride, add stops, and invite your riding crew.</p>
          <button onClick={() => setShowModal(true)} className="btn-primary w-auto px-6">Start a Ride</button>
        </div>
      )}

      {rides.length > 0 && (
        <div className="flex flex-col gap-3 pb-24">
          {rides.map((r) => (
            <button key={r.id} onClick={() => navigate(`/rides/${r.id}`)} className="card p-4 text-left tap flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-pastel-teal flex items-center justify-center text-lg shrink-0">🏁</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{r.name}</p>
                <p className="text-sm text-ink/50 dark:text-white/50">
                  {formatDate(r.created_at)} · {r.ride_members?.[0]?.count ?? 1} rider{(r.ride_members?.[0]?.count ?? 1) === 1 ? '' : 's'}
                </p>
              </div>
              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${STATUS_TINT[r.status]}`}>
                {r.status}
              </span>
            </button>
          ))}
        </div>
      )}

      <Fab onClick={() => setShowModal(true)} label="Start a ride" />

      {showModal && (
        <Sheet title="Start a Ride" subtitle="Name it, then invite your crew" onClose={() => { setShowModal(false); setFormError('') }}>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <input className="input" placeholder="e.g. Weekend Nandi Hills run" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            {formError && <p className="text-sm text-red-500 -mt-1">{formError}</p>}
            <button className="btn-primary" disabled={busy}>{busy ? 'Starting…' : 'Start Ride'}</button>
          </form>
        </Sheet>
      )}
    </div>
  )
}
