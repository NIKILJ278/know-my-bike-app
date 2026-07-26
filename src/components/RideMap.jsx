import { useEffect, useRef } from 'react'
import L from 'leaflet'

// Leaflet's default marker icons reference image files by relative URL,
// which breaks under a bundler. Build a simple colored div-icon instead
// so no separate asset files are needed.
function pinIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
  })
}

export default function RideMap({ stops = [], onMapClick, height = 260 }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const clickHandlerRef = useRef(onMapClick)
  clickHandlerRef.current = onMapClick

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false }).setView([20.5937, 78.9629], 5)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
    map.on('click', (e) => clickHandlerRef.current?.(e.latlng.lat, e.latlng.lng))
    mapRef.current = map
    layerRef.current = L.layerGroup().addTo(map)
    return () => { map.remove(); mapRef.current = null }
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
    </div>
  )
}
