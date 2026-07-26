import { supabase, sharedChannel } from './supabaseClient'

// Public, free STUN servers — enough to discover a device's public
// address for most home/mobile networks. There is intentionally no TURN
// server here (a relay for the minority of very restrictive networks
// where direct peer-to-peer audio can't punch through), since a reliable
// TURN server is a paid service. On networks that need one, that
// specific peer's audio simply won't connect — everything else in the
// app is unaffected.
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

/**
 * A mesh group call for a single ride: every joined participant holds a
 * direct RTCPeerConnection to every other joined participant, with
 * Supabase Realtime Presence + Broadcast standing in for a signaling
 * server (no backend of our own needed).
 *
 * Usage:
 *   const call = createRideCall(rideId, userId, username)
 *   call.on('peers-changed', (peers) => ...)
 *   call.on('ring', ({ from, fromName }) => ...)
 *   await call.join()      // starts mic + connects to anyone already in-call
 *   call.ring()            // notifies all ride members (in-app "ringing")
 *   call.leave()
 */
export function createRideCall(rideId, userId, username) {
  const listeners = {}
  const emit = (evt, data) => { (listeners[evt] || []).forEach((fn) => fn(data)) }
  const on = (evt, fn) => { (listeners[evt] = listeners[evt] || []).push(fn); return () => { listeners[evt] = listeners[evt].filter((f) => f !== fn) } }

  let channel = null
  let localStream = null
  let inCall = false
  const peers = new Map() // userId -> { pc, audioEl, username }

  const channelName = `ride-call:${rideId}`

  function ensureChannel() {
    if (channel) return channel
    channel = sharedChannel(channelName, { config: { presence: { key: userId }, broadcast: { self: false } } })

    channel.on('broadcast', { event: 'ring' }, ({ payload }) => {
      if (payload.from !== userId) emit('ring', payload)
    })
    channel.on('broadcast', { event: 'ring-cancel' }, ({ payload }) => {
      emit('ring-cancel', payload)
    })
    channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
      if (payload.to === userId) handleSignal(payload)
    })
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const list = Object.values(state).flat().filter((p) => p.inCall && p.userId !== userId)
      emit('peers-changed', list)
      if (inCall) reconcilePeers(list)
    })

    channel.subscribe()
    return channel
  }

  function reconcilePeers(list) {
    const liveIds = new Set(list.map((p) => p.userId))
    // Drop connections to anyone who left
    for (const [id, entry] of peers) {
      if (!liveIds.has(id)) { entry.pc.close(); entry.audioEl?.remove(); peers.delete(id) }
    }
    // Connect to anyone new — deterministic initiator (lower id offers)
    // avoids both sides racing to send an offer at once.
    list.forEach((p) => {
      if (peers.has(p.userId)) return
      const iInitiate = userId < p.userId
      connectTo(p.userId, p.username, iInitiate)
    })
  }

  function connectTo(peerId, peerName, iInitiate) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    const audioEl = document.createElement('audio')
    audioEl.autoplay = true
    peers.set(peerId, { pc, audioEl, username: peerName })

    if (localStream) localStream.getTracks().forEach((t) => pc.addTrack(t, localStream))

    pc.ontrack = (e) => { audioEl.srcObject = e.streams[0] }
    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal(peerId, { kind: 'candidate', candidate: e.candidate })
    }
    pc.onconnectionstatechange = () => emit('peer-state', { peerId, state: pc.connectionState })

    if (iInitiate) {
      pc.onnegotiationneeded = async () => {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        sendSignal(peerId, { kind: 'offer', sdp: pc.localDescription })
      }
    }
  }

  function sendSignal(to, data) {
    channel.send({ type: 'broadcast', event: 'signal', payload: { to, from: userId, ...data } })
  }

  async function handleSignal(payload) {
    let entry = peers.get(payload.from)
    if (!entry) {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      const audioEl = document.createElement('audio')
      audioEl.autoplay = true
      entry = { pc, audioEl, username: null }
      peers.set(payload.from, entry)
      if (localStream) localStream.getTracks().forEach((t) => pc.addTrack(t, localStream))
      pc.ontrack = (e) => { audioEl.srcObject = e.streams[0] }
      pc.onicecandidate = (e) => { if (e.candidate) sendSignal(payload.from, { kind: 'candidate', candidate: e.candidate }) }
      pc.onconnectionstatechange = () => emit('peer-state', { peerId: payload.from, state: pc.connectionState })
    }
    const { pc } = entry
    if (payload.kind === 'offer') {
      await pc.setRemoteDescription(payload.sdp)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      sendSignal(payload.from, { kind: 'answer', sdp: pc.localDescription })
    } else if (payload.kind === 'answer') {
      await pc.setRemoteDescription(payload.sdp)
    } else if (payload.kind === 'candidate') {
      try { await pc.addIceCandidate(payload.candidate) } catch { /* ignore benign races */ }
    }
  }

  return {
    on,
    async join() {
      ensureChannel()
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      } catch (err) {
        emit('mic-error', err)
        return false
      }
      inCall = true
      await channel.track({ userId, username, inCall: true })
      return true
    },
    ring() {
      ensureChannel()
      channel.send({ type: 'broadcast', event: 'ring', payload: { from: userId, fromName: username } })
    },
    cancelRing() {
      channel?.send({ type: 'broadcast', event: 'ring-cancel', payload: { from: userId } })
    },
    toggleMute(muted) {
      localStream?.getAudioTracks().forEach((t) => { t.enabled = !muted })
    },
    leave() {
      inCall = false
      for (const [, entry] of peers) { entry.pc.close(); entry.audioEl?.remove() }
      peers.clear()
      localStream?.getTracks().forEach((t) => t.stop())
      localStream = null
      channel?.track({ userId, username, inCall: false })
    },
    destroy() {
      this.leave()
      if (channel) { supabase.removeChannel(channel); channel = null }
    },
    listenOnly() {
      // Subscribe to ring/presence without opening the mic — used by the
      // app-wide overlay so a ring can be heard even when the user isn't
      // on the Ride screen yet.
      ensureChannel()
    },
  }
}
