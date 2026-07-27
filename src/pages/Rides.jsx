import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRides } from '../hooks/useRides'
import Sheet from '../components/Sheet.jsx'
import Fab from '../components/Fab.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { formatDate } from '../lib/format'
import BikeLogo from '../components/BikeLogo.jsx'
import { FlagIcon } from '../components/icons/Icon.jsx'

const STATUS_TINT = {
  planning: 'bg-pastel-blue text-blue-900',
  active: 'bg-pastel-green text-green-900',
  ended: 'bg-surface-muted dark:bg-surface-darkmuted text-ink/50 dark:text-white/50',
}

export default function Rides() {
  const { user } = useAuth()
  const { rides, loading, startRide, deleteRide } = useRides()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setFormError('')
    const { data, error } = await startRide(name.trim() || 'Group Ride')
    setBusy(false)
    if (!error && data) navigate(`/rides/${data.id}`)
    else if (error) setFormError(error.message || 'Could not start the ride. Please try again.')
  }

  const exitSelectMode = () => { setSelectMode(false); setSelected(new Set()) }
  const toggleSelected = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const runDelete = async () => {
    setDeleting(true)
    await Promise.all(Array.from(selected).map((id) => deleteRide(id)))
    setDeleting(false)
    setConfirmOpen(false)
    exitSelectMode()
  }

  return (
    <div className="px-6 pt-14">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-extrabold">Ride</h1>
          <p className="text-ink/50 dark:text-white/50">Plan a route, invite riders, stay connected.</p>
        </div>
        {rides.length > 0 && (
          <button
            onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
            className="text-sm font-semibold text-amber-dark dark:text-amber pt-1 shrink-0"
          >
            {selectMode ? 'Cancel' : 'Select'}
          </button>
        )}
      </div>

      {!loading && rides.length === 0 && (
        <div className="flex flex-col items-center text-center py-16">
          <div className="w-20 h-20 rounded-full bg-surface-muted dark:bg-surface-darkmuted flex items-center justify-center mb-4"><BikeLogo size={34} className="text-ink/60 dark:text-white/60" /></div>
          <p className="font-bold text-lg mb-1">No rides yet</p>
          <p className="text-ink/50 dark:text-white/50 mb-6">Start a ride, add stops, and invite your riding crew.</p>
          <button onClick={() => setShowModal(true)} className="btn-primary w-auto px-6">Start a Ride</button>
        </div>
      )}

      {rides.length > 0 && (
        <div className={`flex flex-col gap-3 ${selectMode && selected.size > 0 ? 'pb-44' : 'pb-24'}`}>
          {rides.map((r) => {
            const isHost = r.host_id === user.id
            const isSelected = selected.has(r.id)
            const handleClick = () => {
              if (!selectMode) { navigate(`/rides/${r.id}`); return }
              if (isHost) toggleSelected(r.id)
            }
            return (
              <button
                key={r.id}
                onClick={handleClick}
                className={`card p-4 text-left tap flex items-center gap-3 ${selectMode && !isHost ? 'opacity-50' : ''}`}
              >
                {selectMode && (
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-amber border-amber' : 'border-black/20 dark:border-white/25'}`}>
                    {isSelected && <CheckIcon />}
                  </span>
                )}
                <div className="w-11 h-11 rounded-xl bg-pastel-teal flex items-center justify-center shrink-0"><FlagIcon size={19} className="text-teal-700" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{r.name}</p>
                  <p className="text-sm text-ink/50 dark:text-white/50">
                    {formatDate(r.created_at)} · {r.ride_members?.[0]?.count ?? 1} rider{(r.ride_members?.[0]?.count ?? 1) === 1 ? '' : 's'}
                    {selectMode && !isHost ? ' · Not yours to delete' : ''}
                  </p>
                </div>
                {!selectMode && (
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${STATUS_TINT[r.status]}`}>
                    {r.status}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {!selectMode && <Fab onClick={() => setShowModal(true)} label="Start a ride" />}

      {selectMode && selected.size > 0 && (
        <div className="fixed left-0 right-0 z-30 flex justify-center px-6" style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
          <div className="w-full max-w-lg bg-ink dark:bg-white text-white dark:text-ink rounded-2xl px-5 py-4 flex items-center justify-between shadow-fab">
            <span className="font-semibold">{selected.size} selected</span>
            <button onClick={() => setConfirmOpen(true)} className="tap flex items-center gap-1.5 bg-red-500 text-white font-semibold text-sm px-4 py-2 rounded-full">
              <TrashIcon /> Delete
            </button>
          </div>
        </div>
      )}

      {confirmOpen && (
        <ConfirmDialog
          title={`Delete ${selected.size} ride${selected.size > 1 ? 's' : ''}?`}
          message="This removes the ride, its members, and its stops for everyone. This can't be undone."
          onCancel={() => setConfirmOpen(false)}
          onConfirm={runDelete}
          busy={deleting}
        />
      )}

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

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#12141C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}
