import { Browser } from '@capacitor/browser'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRide } from '../hooks/useRides'
import { useRideCall } from '../hooks/useRideCall'
import RideMap from '../components/RideMap.jsx'
import AddStopModal from '../components/modals/AddStopModal.jsx'
import InviteMemberModal from '../components/modals/InviteMemberModal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { navigateToStops } from '../lib/location'
import BikeLogo from '../components/BikeLogo.jsx'
import { WarningIcon } from '../components/icons/Icon.jsx'

const STATUS_LABEL = { invited: 'Invited', joined: 'Joined', declined: 'Declined' }

export default function RideRoom() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile } = useAuth()
  const { ride, members, stops, myMembership, loading, error, inviteByPhoneOrCode, respondToInvite, addStop, removeStop, setStatus } = useRide(id)
  const username = profile?.username || user?.email?.split('@')[0] || 'Rider'
  const call = useRideCall(id, user?.id, username)

  const [showInvite, setShowInvite] = useState(false)
  const [showAddStop, setShowAddStop] = useState(false)
  const [pendingPin, setPendingPin] = useState(null)
  const [removeConfirm, setRemoveConfirm] = useState(null)

  useEffect(() => {
    if (location.state?.autoJoin) {
      call.joinCall()
      navigate(location.pathname, { replace: true, state: {} })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.autoJoin])

  if (loading) {
    return (
      <div className="px-6 pt-14 flex flex-col items-center text-center py-16">
        <div className="w-10 h-10 rounded-full border-2 border-ink/20 dark:border-white/20 border-t-amber animate-spin mb-4" />
        <p className="text-ink/50 dark:text-white/50">Loading ride…</p>
      </div>
    )
  }

  if (!ride) {
    return (
      <div className="px-6 pt-14 flex flex-col items-center text-center py-16">
        <div className="w-16 h-16 rounded-full bg-surface-muted dark:bg-surface-darkmuted flex items-center justify-center mb-4"><WarningIcon size={26} className="text-ink/50 dark:text-white/50" /></div>
        <p className="font-bold text-lg mb-1">Couldn't load this ride</p>
        <p className="text-ink/50 dark:text-white/50 mb-1 max-w-xs">
          {error?.message || 'It may have been removed, or you may not have access to it.'}
        </p>
        {error?.code && <p className="text-xs text-ink/30 dark:text-white/30 mb-6">Error code: {error.code}</p>}
        <button onClick={() => navigate('/rides')} className="btn-primary w-auto px-6 mt-4">Back to Rides</button>
      </div>
    )
  }

  const isHost = ride.host_id === user.id
  const hasJoined = myMembership?.status === 'joined'
  const joinedMembers = members.filter((m) => m.status === 'joined')

  const handleMapClick = (lat, lng) => {
    if (!hasJoined && !isHost) return
    setPendingPin({ lat, lng })
    setShowAddStop(true)
  }

  const handleNavigate = async () => {
    const url = navigateToStops(stops)
    if (!url) return
    await Browser.open({ url })
  }

  const startRideIfNeeded = async () => {
    if (ride.status === 'planning') await setStatus('active')
  }

  const handleConnect = async () => {
    await startRideIfNeeded()
    const ok = await call.joinCall()
    if (ok) call.ringEveryone()
  }

  return (
    <div className="px-6 pt-14 pb-32">
      <div className="flex items-start justify-between mb-2">
        <button onClick={() => navigate('/rides')} className="text-sm font-semibold text-ink/50 dark:text-white/50 flex items-center gap-1">
          <BackIcon /> Rides
        </button>
        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${ride.status === 'active' ? 'bg-pastel-green text-green-900' : ride.status === 'ended' ? 'bg-surface-muted dark:bg-surface-darkmuted text-ink/50 dark:text-white/50' : 'bg-pastel-blue text-blue-900'}`}>
          {ride.status}
        </span>
      </div>
      <h1 className="text-2xl font-display font-extrabold mb-1">{ride.name}</h1>
      <p className="text-ink/50 dark:text-white/50 mb-6">{joinedMembers.length} rider{joinedMembers.length === 1 ? '' : 's'} joined</p>

      {/* Members */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold">Members</h3>
          <button onClick={() => setShowInvite(true)} className="text-sm font-semibold text-amber-dark dark:text-amber">+ Invite</button>
        </div>
        <div className="flex flex-col gap-2">
          {members.map((m) => {
            const isMe = m.user_id === user.id
            const inCallNow = call.peers.some((p) => p.userId === m.user_id) || (isMe && call.inCall)
            return (
              <div key={m.id} className="card px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-ink dark:bg-white text-white dark:text-ink flex items-center justify-center font-bold text-sm shrink-0">
                  {(m.username || '?')[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{isMe ? `${m.username || 'You'} (You)` : m.username}</p>
                  <p className="text-xs text-ink/50 dark:text-white/50">{STATUS_LABEL[m.status]}{inCallNow ? ' · On call' : ''}</p>
                </div>
                {inCallNow && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
              </div>
            )
          })}
        </div>

        {myMembership?.status === 'invited' && (
          <div className="card p-4 mt-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">You're invited to this ride</p>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => respondToInvite(false)} className="tap text-sm font-semibold text-ink/50 dark:text-white/50 px-3 py-1.5">Decline</button>
              <button onClick={() => respondToInvite(true)} className="tap text-sm font-semibold bg-amber text-ink px-4 py-1.5 rounded-full">Accept</button>
            </div>
          </div>
        )}
      </section>

      {/* Map + stops */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold">Route</h3>
          <button onClick={() => { setPendingPin(null); setShowAddStop(true) }} className="text-sm font-semibold text-amber-dark dark:text-amber">+ Add stop</button>
        </div>
        <RideMap stops={stops} onMapClick={handleMapClick} />
        <p className="text-xs text-ink/40 dark:text-white/40 mt-2">Tap the map to drop a pin, search in Add Stop, or use the locate button to find yourself. Free OpenStreetMap — no account needed.</p>

        {stops.length > 0 && (
          <button
            onClick={handleNavigate}
            className="tap w-full mt-3 bg-ink dark:bg-white text-white dark:text-ink font-semibold rounded-2xl py-3 flex items-center justify-center gap-2"
          >
            <NavigateIcon /> Navigate {stops.length > 1 ? `through ${stops.length} stops` : 'to this stop'}
          </button>
        )}

        {stops.length > 0 && (
          <div className="flex flex-col mt-3">
            {stops.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 py-2.5 border-b border-black/5 dark:border-white/10 last:border-0">
                <span className="w-6 h-6 rounded-full bg-surface-muted dark:bg-surface-darkmuted flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                <p className="flex-1 text-sm font-medium truncate">{s.label}</p>
                <button onClick={() => setRemoveConfirm(s)} aria-label="Remove stop" className="tap text-ink/30 dark:text-white/30 shrink-0">
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {call.micError && (
        <div className="card p-4 mb-4 border border-red-500/30">
          <p className="text-sm font-semibold text-red-500">Microphone access needed</p>
          <p className="text-xs text-ink/50 dark:text-white/50 mt-1">{call.micError} Enable microphone permission for Know My Bike in your phone's app settings, then try again.</p>
        </div>
      )}

      {/* Connect bar */}
      <div className="fixed left-0 right-0 z-30 flex justify-center px-6" style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
        <div className="w-full max-w-lg bg-ink dark:bg-white text-white dark:text-ink rounded-2xl px-5 py-4 flex items-center justify-between shadow-fab">
          {call.inCall ? (
            <>
              <div>
                <p className="font-semibold">On call</p>
                <p className="text-xs opacity-60">{call.peers.length} other rider{call.peers.length === 1 ? '' : 's'} connected</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={call.toggleMute} className="tap w-11 h-11 rounded-full bg-white/15 flex items-center justify-center">
                  {call.muted ? <MicOffIcon /> : <MicIcon />}
                </button>
                <button onClick={call.leaveCall} className="tap w-11 h-11 rounded-full bg-red-500 text-white flex items-center justify-center">
                  <PhoneOffIcon />
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="font-semibold">Let's Connect</p>
                <p className="text-xs opacity-60">Rings every joined rider, walkie-talkie style</p>
              </div>
              <button onClick={handleConnect} disabled={call.connecting} className="tap bg-amber text-ink font-semibold px-5 py-2.5 rounded-full flex items-center gap-2 disabled:opacity-60">
                <PhoneIcon /> {call.connecting ? 'Connecting…' : 'Connect'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Incoming ring, if it happens while already on this screen */}
      {call.incomingRing && !call.inCall && (
        <IncomingCallCard name={call.incomingRing.fromName} onAccept={call.joinCall} onDecline={call.dismissRing} />
      )}

      {showInvite && (
        <InviteMemberModal onClose={() => setShowInvite(false)} onInvite={inviteByPhoneOrCode} />
      )}
      {showAddStop && (
        <AddStopModal onClose={() => { setShowAddStop(false); setPendingPin(null) }} onAdd={addStop} presetCoords={pendingPin} />
      )}
      {removeConfirm && (
        <ConfirmDialog
          title="Remove this stop?"
          message={removeConfirm.label}
          onCancel={() => setRemoveConfirm(null)}
          onConfirm={async () => { await removeStop(removeConfirm.id); setRemoveConfirm(null) }}
        />
      )}
    </div>
  )
}

function IncomingCallCard({ name, onAccept, onDecline }) {
  return (
    <div className="fixed inset-0 z-[70] bg-black/70 flex flex-col items-center justify-center gap-6 px-8">
      <div className="w-24 h-24 rounded-full bg-amber flex items-center justify-center animate-pulse"><BikeLogo size={38} className="text-ink" /></div>
      <div className="text-center">
        <p className="text-white text-xl font-display font-extrabold">{name || 'A rider'} is calling the group</p>
        <p className="text-white/60 text-sm mt-1">Ride walkie-talkie</p>
      </div>
      <div className="flex gap-6">
        <button onClick={onDecline} className="tap w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center">
          <PhoneOffIcon />
        </button>
        <button onClick={onAccept} className="tap w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center">
          <PhoneIcon />
        </button>
      </div>
    </div>
  )
}

function BackIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg> }
function NavigateIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-8-8 18-2-8-8-2z" /></svg> }
function TrashIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16z" /></svg> }
function MicIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 19v3" /></svg> }
function MicOffIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l22 22M9 9v3a3 3 0 0 0 4.6 2.5M15 5.5V5a3 3 0 0 0-5.8-1.1" /><path d="M5 10a7 7 0 0 0 10.6 6M12 19v3" /></svg> }
function PhoneIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .7 2.9a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.4c.9.4 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z" /></svg> }
function PhoneOffIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.7 5.2A16 16 0 0 1 12 4a2 2 0 0 1 2 1.7c.1 1 .3 2 .7 2.9a2 2 0 0 1-.4 2.1l-1.2 1.2c.4.7.9 1.4 1.5 2M14.5 14.5a16 16 0 0 0 3.5 2.4c.9.4 1.9.6 2.9.7a2 2 0 0 1 1.7 2v3a2 2 0 0 1-2.2 2 19.7 19.7 0 0 1-7.1-2.1M1 1l22 22" /></svg> }
