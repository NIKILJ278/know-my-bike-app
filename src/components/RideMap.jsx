import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { getCurrentLocation } from '../lib/location'

// Leaflet's default marker icons reference image files by relative URL,
// which breaks under a bundler. Build simple colored div-icons instead
// so no separate asset files are needed.
function pinIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
  })
}

function meIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:#3B82F6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

// Tiles are requested through the service worker registered in main.jsx,
// which caches every tile image the rider has ever seen. Once a tile is
// cached, it renders instantly from disk with no network at all — so a
// previously-viewed area of the map keeps working with no signal. Tiles
// for places never opened before still need a connection the first time,
// same as any map app.
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

export default function RideMap({ stops = [], onMapClick, onLocate, height = 260, autoLocate = false }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const meMarkerRef = useRef(null)
  const clickHandlerRef = useRef(onMapClick)
  clickHandlerRef.current = onMapClick
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState('')
  const [offline, setOffline] = useState(!navigator.onLine)

  const locateMe = async () => {
    setLocating(true)
    setLocateError('')
    try {
      const coords = await getCurrentLocation()
      const map = mapRef.current
      if (meMarkerRef.current) meMarkerRef.current.remove()
      meMarkerRef.current = L.marker([coords.lat, coords.lng], { icon: meIcon(), zIndexOffset: 1000 })
        .addTo(layerRef.current)
        .bindPopup('You are here')
      map.setView([coords.lat, coords.lng], Math.max(map.getZoom(), 13))
      onLocate?.(coords)
    } catch (err) {
      setLocateError(err.message || 'Could not get your location.')
    }
    setLocating(false)
  }
  const locateMeRef = useRef(locateMe)
  locateMeRef.current = locateMe

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false }).setView([20.5937, 78.9629], 5)
    L.tileLayer(TILE_URL, { maxZoom: 19 }).addTo(map)
    map.on('click', (e) => clickHandlerRef.current?.(e.latlng.lat, e.latlng.lng))
    mapRef.current = map
    layerRef.current = L.layerGroup().addTo(map)

    // Ask for location and center on the rider automatically, the way
    // Google Maps does when you open it — only when there's nothing else
    // (like existing stops) already telling the map where to look.
    if (autoLocate && stops.length === 0) {
      locateMeRef.current()
    }

    return () => { map.remove(); mapRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onOnline = () => setOffline(false)
    const onOffline = () => setOffline(true)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()

    if (stops.length === 0) return

    stops.forEach((s, i) => {
      L.marker([s.lat, s.lng], { icon: pinIcon(i === 0 ? '#2FB6A6' : i === stops.length - 1 ? '#E38A6E' : '#F2A93B') })
        .addTo(layer)
        .bindPopup(s.label)
    })

    if (stops.length > 1) {
      L.polyline(stops.map((s) => [s.lat, s.lng]), { color: '#F2A93B', weight: 3, opacity: 0.6, dashArray: '6 6' }).addTo(layer)
    }

    const bounds = L.latLngBounds(stops.map((s) => [s.lat, s.lng]))
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 })
  }, [stops])

  return (
    <div className="relative isolate w-full rounded-2xl overflow-hidden" style={{ height }}>
      <div ref={containerRef} className="w-full h-full" />
      {offline && (
        <div className="absolute top-3 left-3 z-10 bg-black/75 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-full flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber" /> Offline — showing cached map
        </div>
      )}
      <button
        type="button"
        onClick={locateMe}
        disabled={locating}
        aria-label="Use my current location"
        className="tap absolute bottom-3 right-3 z-10 w-10 h-10 rounded-full bg-white dark:bg-ink text-ink dark:text-white shadow-card flex items-center justify-center disabled:opacity-60"
      >
        {locating ? (
          <span className="w-4 h-4 rounded-full border-2 border-ink/20 dark:border-white/20 border-t-amber animate-spin" />
        ) : (
          <LocateIcon />
        )}
      </button>
      {locateError && (
        <div className="absolute bottom-3 left-3 right-14 z-10 bg-black/75 text-white text-xs font-medium px-3 py-2 rounded-xl">
          {locateError}
        </div>
      )}
    </div>
  )
}

function LocateIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  )
}
