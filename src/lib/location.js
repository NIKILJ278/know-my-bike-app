import { Geolocation } from '@capacitor/geolocation'
import { Capacitor } from '@capacitor/core'

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
