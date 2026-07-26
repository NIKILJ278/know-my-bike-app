import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRides } from '../hooks/useRides'
import { createRideCall } from '../lib/rideCall'

export default function GlobalRingOverlay() {
  const { user, profile } = useAuth()
  const { rides } = useRides()
  const location = useLocation()
  const navigate = useNavigate()
  const [ring, setRing] = useState(null) // { rideId, rideName, from, fromName }
  const callsRef = useRef(new Map())

  const username = profile?.username || user?.email?.split('@')[0] || 'Rider'

  // Only rides the user has actually joined are worth ringing for.
  const activeRideIds = rides.filter((r) => r.status !== 'ended').map((r) => r.id)

  useEffect(() => {
    if (!user) return

    const known = new Set(activeRideIds)
    // Tear down listeners for rides no longer relevant
    for (const [rideId, call] of callsRef.current) {
      if (!known.has(rideId)) { call.destroy(); callsRef.current.delete(rideId) }
    }
    // Set up listeners for any newly relevant rides
    activeRideIds.forEach((rideId) => {
      if (callsRef.current.has(rideId)) return
      const call = createRideCall(rideId, user.id, username)
      call.listenOnly()
      call.on('ring', (payload) => {
        const ride = rides.find((r) => r.id === rideId)
        setRing({ rideId, rideName: ride?.name, from: payload.from, fromName: payload.fromName })
      })
      call.on('ring-cancel', () => setRing((r) => (r?.rideId === rideId ? null : r)))
      callsRef.current.set(rideId, call)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeRideIds.join(',')])

  useEffect(() => () => { for (const [, call] of callsRef.current) call.destroy() }, [])

  if (!ring) return null
  // If the user is already sitting on that ride's own screen, its inline
  // incoming-call card handles this instead — avoid a duplicate overlay.
  if (location.pathname === `/rides/${ring.rideId}`) return null

  return (
    <div className="fixed inset-0 z-[80] bg-black/80 flex flex-col items-center justify-center gap-6 px-8">
      <div className="w-24 h-24 rounded-full bg-amber flex items-center justify-center text-4xl animate-pulse">🏍️</div>
      <div className="text-center">
        <p className="text-white/60 text-sm mb-1">{ring.rideName}</p>
        <p className="text-white text-xl font-display font-extrabold">{ring.fromName || 'A rider'} is calling the group</p>
      </div>
      <div className="flex gap-6">
        <button onClick={() => setRing(null)} className="tap w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center text-2xl">✕</button>
        <button onClick={() => { navigate(`/rides/${ring.rideId}`, { state: { autoJoin: true } }); setRing(null) }} className="tap w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center text-2xl">✓</button>
      </div>
    </div>
  )
}
