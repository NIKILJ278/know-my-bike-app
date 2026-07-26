// Free place search via OpenStreetMap's Nominatim, used for ride waypoints
// so this works with zero setup. If you get a Google Maps API key later,
// swap this one function out and the rest of the Rides feature (waypoint
// storage, map links) doesn't need to change.
export async function searchPlaces(query) {
  if (!query || query.trim().length < 2) return []
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q=${encodeURIComponent(query)}`
  try {
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
    if (!res.ok) return []
    const data = await res.json()
    return data.map((r) => ({
      label: r.display_name,
      lat: Number(r.lat),
      lng: Number(r.lon),
    }))
  } catch {
    // Network error, or Nominatim rate-limited/blocked the request — fail
    // quietly so the UI can fall back to "no results" instead of hanging
    // on a spinner forever.
    return []
  }
}

export function mapLinkFor(lat, lng) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`
}
