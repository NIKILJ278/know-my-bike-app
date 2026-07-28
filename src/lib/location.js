import { Geolocation } from '@capacitor/geolocation'
import { Capacitor } from '@capacitor/core'

/**
 * Starts watching the device's GPS and calls onUpdate with the current
 * speed in km/h (and raw coords) every time a new fix comes in. GPS speed
 * is only meaningful while actually moving — most devices report 0 or
 * null when stationary, which is expected, not a bug. Returns a stop()
 * function to end tracking.
 */
const toRad = (deg) => (deg * Math.PI) / 180

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/**
 * Turns a raw GPS fix into a speed reading, filling in the gaps that make
 * coords.speed feel slow/unresponsive on its own:
 *  - The device's own coords.speed (Doppler-derived from the GPS chip) is
 *    the fastest-reacting number available — it updates the moment the
 *    chip sees the change, so we trust it immediately and fully the
 *    instant it's present. The previous version blended it 70/30 with a
 *    distance-derived value, and that 30% pulled every reading toward the
 *    *previous* fix's average speed — exactly what made 40 km/h read as 0
 *    and then crawl up to 32 instead of jumping straight there.
 *  - Only when the device doesn't populate coords.speed at all do we fall
 *    back to computing it from distance/time between consecutive fixes,
 *    so there's still a live number instead of a dead 0.
 */
function makeSpeedDeriver() {
  let last = null // { lat, lng, t }
  return (coords, timestamp) => {
    const now = timestamp || Date.now()
    const { latitude: lat, longitude: lng, accuracy, speed } = coords
    const reportedKmh = speed == null || speed < 0 ? null : speed * 3.6

    let speedKmh = reportedKmh
    if (speedKmh == null && last) {
      const dtSec = (now - last.t) / 1000
      // Ignore fixes that land closer together than ~0.15s (noisy) or
      // further apart than 10s (stale) rather than compute from them.
      if (dtSec > 0.15 && dtSec < 10) {
        const distKm = haversineKm(last.lat, last.lng, lat, lng)
        const derivedKmh = (distKm / dtSec) * 3600
        const accuracyOk = accuracy == null || accuracy < 40
        speedKmh = accuracyOk ? derivedKmh : 0
      }
    }
    last = { lat, lng, t: now }
    return speedKmh == null || speedKmh < 0 ? 0 : speedKmh
  }
}

// Both the browser Geolocation API and the native fused location provider
// are free to throttle watchPosition to whatever interval they think is
// "efficient" (often 3-10s), which is exactly what made 40 km/h sit at 0
// for a long stretch before jumping. There's no public option to force a
// specific update interval through either API, so instead of only reacting
// to whatever watchPosition hands back, this actively polls with
// getCurrentPosition (maximumAge: 0, so it can never return a stale/cached
// fix) on a tight interval and takes whichever of the two — the watch
// callback or the poll — reports the newest fix. In practice this roughly
// doubles or triples how often the GPS chip is asked for a fresh position,
// which is what actually fixes the "long time to update" complaint (the
// smoothing/animation was never the bottleneck — the fix rate was).
const POLL_INTERVAL_MS = 1200
const POLL_TIMEOUT_MS = 2500

export async function watchSpeed(onUpdate, onError) {
  const deriveSpeed = makeSpeedDeriver()
  let lastFixAt = 0

  const emit = (coords, timestamp) => {
    const t = timestamp || Date.now()
    // Ignore a fix older than the one we already applied — the watch
    // callback and the poll can race, and we only want the freshest.
    if (t <= lastFixAt) return
    lastFixAt = t
    onUpdate({
      speedKmh: deriveSpeed(coords, t),
      lat: coords.latitude,
      lng: coords.longitude,
      accuracy: coords.accuracy,
      fixAt: t,
    })
  }

  if (Capacitor.isNativePlatform()) {
    const perm = await Geolocation.requestPermissions()
    if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
      onError?.(new Error('Location permission was denied.'))
      return () => {}
    }

    // Kick off with one immediate low-accuracy fix so the display shows
    // something within ~1s instead of sitting at 0 while the high-accuracy
    // GPS chip warms up (that warm-up, not the UI, is what causes the
    // first reading to lag).
    Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 3000, maximumAge: 5000 })
      .then((pos) => emit(pos.coords, pos.timestamp))
      .catch(() => {})

    const watchId = await Geolocation.watchPosition(
      { enableHighAccuracy: true, maximumAge: 0, timeout: 3000 },
      (pos, err) => {
        if (err) { onError?.(err); return }
        if (!pos) return
        emit(pos.coords, pos.timestamp)
      }
    )

    const pollId = setInterval(() => {
      Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: POLL_TIMEOUT_MS, maximumAge: 0 })
        .then((pos) => emit(pos.coords, pos.timestamp))
        .catch(() => {})
    }, POLL_INTERVAL_MS)

    return () => { Geolocation.clearWatch({ id: watchId }); clearInterval(pollId) }
  }

  if (!navigator.geolocation) {
    onError?.(new Error('Location is not available in this browser.'))
    return () => {}
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => emit(pos.coords, pos.timestamp),
    () => {},
    { enableHighAccuracy: false, timeout: 3000, maximumAge: 5000 }
  )

  const id = navigator.geolocation.watchPosition(
    (pos) => emit(pos.coords, pos.timestamp),
    (err) => onError?.(err),
    // maximumAge: 0 forces a fresh fix every time instead of letting the
    // browser hand back a cached position.
    { enableHighAccuracy: true, maximumAge: 0, timeout: POLL_TIMEOUT_MS }
  )

  const pollId = setInterval(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => emit(pos.coords, pos.timestamp),
      () => {}, // stay quiet on poll misses — the watch callback / next poll will catch up
      { enableHighAccuracy: true, maximumAge: 0, timeout: POLL_TIMEOUT_MS }
    )
  }, POLL_INTERVAL_MS)

  return () => { navigator.geolocation.clearWatch(id); clearInterval(pollId) }
}

/**
 * Watches the device's compass heading (0–360°, 0 = North) using the
 * DeviceOrientation API. Works on Android out of the box; iOS 13+ needs an
 * explicit permission prompt first (see requestHeadingPermission).
 */
export function watchHeading(onUpdate) {
  if (typeof window === 'undefined' || typeof window.DeviceOrientationEvent === 'undefined') {
    return () => {}
  }

  const handler = (e) => {
    let heading = null
    if (typeof e.webkitCompassHeading === 'number') {
      // iOS reports compass heading directly, already clockwise from North.
      heading = e.webkitCompassHeading
    } else if (e.alpha != null) {
      // Android's alpha is counter-clockwise from the device's start
      // orientation; converting gives a clockwise-from-North bearing.
      heading = 360 - e.alpha
    }
    if (heading != null) onUpdate(((heading % 360) + 360) % 360)
  }

  window.addEventListener('deviceorientationabsolute', handler, true)
  window.addEventListener('deviceorientation', handler, true)
  return () => {
    window.removeEventListener('deviceorientationabsolute', handler, true)
    window.removeEventListener('deviceorientation', handler, true)
  }
}

/**
 * iOS 13+ requires an explicit user-gesture-triggered permission request
 * before deviceorientation events will fire. Call this from a button tap.
 * Returns true if heading updates are (or will be) allowed.
 */
export async function requestHeadingPermission() {
  const DOE = typeof window !== 'undefined' ? window.DeviceOrientationEvent : undefined
  if (DOE && typeof DOE.requestPermission === 'function') {
    try {
      const result = await DOE.requestPermission()
      return result === 'granted'
    } catch {
      return false
    }
  }
  return true // Android / browsers that don't gate this behind a prompt
}

/**
 * Gets the device's current GPS location, requesting permission the
 * first time it's used. Falls back to the browser's geolocation API when
 * running outside the native app (e.g. local dev in a browser).
 */
export async function getCurrentLocation() {
  if (Capacitor.isNativePlatform()) {
    const perm = await Geolocation.requestPermissions()
    if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
      throw new Error('Location permission was denied.')
    }
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 })
    return { lat: pos.coords.latitude, lng: pos.coords.longitude }
  }

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Location is not available in this browser.'))
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error('Could not get your location.')),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  })
}

/**
 * Opens the device's default maps app with turn-by-turn directions
 * through a list of stops, in order. Building real in-app turn-by-turn
 * navigation would need its own dedicated routing/voice-guidance engine —
 * handing off to the maps app the rider already has and trusts (Google
 * Maps, Apple Maps, whatever they use) is the realistic, reliable version
 * of "navigate" here.
 */
export function navigateToStops(stops) {
  if (!stops || stops.length === 0) return
  const destination = stops[stops.length - 1]
  const waypoints = stops.slice(0, -1)
  const params = new URLSearchParams({
    api: '1',
    destination: `${destination.lat},${destination.lng}`,
    travelmode: 'driving',
  })
  if (waypoints.length > 0) {
    params.set('waypoints', waypoints.map((s) => `${s.lat},${s.lng}`).join('|'))
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`
}
