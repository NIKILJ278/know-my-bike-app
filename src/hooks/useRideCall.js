import { useEffect, useRef, useState } from 'react'
import { createRideCall } from '../lib/rideCall'

export function useRideCall(rideId, userId, username) {
  const callRef = useRef(null)
  const [peers, setPeers] = useState([])
  const [inCall, setInCall] = useState(false)
  const [muted, setMuted] = useState(false)
  const [incomingRing, setIncomingRing] = useState(null) // { from, fromName }
  const [micError, setMicError] = useState(null)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    if (!rideId || !userId) return
    const call = createRideCall(rideId, userId, username)
    callRef.current = call
    call.listenOnly()

    const offPeers = call.on('peers-changed', setPeers)
    const offRing = call.on('ring', (payload) => setIncomingRing(payload))
    const offRingCancel = call.on('ring-cancel', () => setIncomingRing(null))
    const offMicErr = call.on('mic-error', (err) => setMicError(err?.message || 'Microphone permission was denied.'))

    return () => {
      offPeers(); offRing(); offRingCancel(); offMicErr()
      call.destroy()
      callRef.current = null
    }
  }, [rideId, userId, username])

  const joinCall = async () => {
    setConnecting(true)
    setIncomingRing(null)
    const ok = await callRef.current?.join()
    setConnecting(false)
    if (ok) setInCall(true)
    return ok
  }

  const ringEveryone = () => callRef.current?.ring()
  const cancelRing = () => callRef.current?.cancelRing()

  const leaveCall = () => {
    callRef.current?.leave()
    setInCall(false)
    setMuted(false)
  }

  const toggleMute = () => {
    setMuted((m) => {
      callRef.current?.toggleMute(!m)
      return !m
    })
  }

  const dismissRing = () => setIncomingRing(null)

  return { peers, inCall, muted, incomingRing, micError, connecting, joinCall, ringEveryone, cancelRing, leaveCall, toggleMute, dismissRing }
}
