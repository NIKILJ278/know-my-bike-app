import { useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useBikes } from '../context/BikeContext'

// Deterministic accent pair per bike, so different bikes in a garage don't
// all look identical when there's no uploaded photo yet.
const PALETTES = [
  ['#1B2530', '#F2A93B'], // ink -> amber (brand default)
  ['#16302B', '#3FD1B0'], // deep teal -> mint
  ['#2A1B30', '#C98CE0'], // plum -> lilac
  ['#1B2A3A', '#5FA8E0'], // navy -> sky
  ['#301B1E', '#E38A6E'], // maroon -> coral
]

function paletteFor(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return PALETTES[hash % PALETTES.length]
}

export default function BikeHeroCard({ bike }) {
  const { user } = useAuth()
  const { updateBike } = useBikes()
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef(null)

  const pickFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('bike-photos').upload(path, file, {
        cacheControl: '3600', upsert: false, contentType: file.type,
      })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('bike-photos').getPublicUrl(path)
      if (data?.publicUrl) await updateBike(bike.id, { photo_url: data.publicUrl })
    } catch {
      // silently ignore — worst case the fallback illustration stays up
    }
    setUploading(false)
  }

  if (bike.photo_url) {
    return (
      <div
        className="relative rounded-2xl overflow-hidden h-64 mb-6 flex flex-col justify-end p-5 text-white bg-cover bg-center"
        style={{ backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0.05)), url(${bike.photo_url})` }}
      >
        <input ref={inputRef} type="file" accept="image/*" onChange={pickFile} className="hidden" />
        {bike.make && (
          <span className="absolute top-4 left-4 bg-white/90 text-ink text-xs font-semibold px-3 py-1 rounded-full">{bike.make.split(' ')[0]}</span>
        )}
        <button onClick={() => inputRef.current?.click()} className="tap absolute top-4 right-4 bg-black/50 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
          {uploading ? 'Uploading…' : 'Change photo'}
        </button>
        <CardBody bike={bike} light />
      </div>
    )
  }

  const [base, accent] = paletteFor(bike.name)
  return (
    <div
      className="relative rounded-2xl overflow-hidden h-64 mb-6 flex flex-col justify-end p-5 text-white"
      style={{ background: `linear-gradient(155deg, ${base} 0%, #0B0E14 78%)` }}
    >
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={pickFile} className="hidden" />
      <RouteMotif accent={accent} />
      {bike.make && (
        <span className="absolute top-4 left-4 bg-white/12 backdrop-blur text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/20">{bike.make.split(' ')[0]}</span>
      )}
      <button onClick={() => inputRef.current?.click()} className="tap absolute top-4 right-4 bg-white/12 backdrop-blur text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-1.5">
        <CameraIcon /> {uploading ? 'Uploading…' : 'Add photo'}
      </button>
      <CardBody bike={bike} light accent={accent} />
    </div>
  )
}

function CardBody({ bike, accent = '#F2A93B' }) {
  return (
    <div className="relative z-10">
      <h2 className="text-2xl font-display font-extrabold">{bike.name}</h2>
      <div className="flex gap-6 mt-2">
        <div>
          <p className="text-[10px] tracking-wide text-white/70 font-semibold">ODOMETER</p>
          <p className="font-bold">{Number(bike.odometer_km || 0).toLocaleString('en-IN')} km</p>
        </div>
        <div>
          <p className="text-[10px] tracking-wide text-white/70 font-semibold">AVG MILEAGE</p>
          <p className="font-bold" style={{ color: bike.avg_mileage ? accent : undefined }}>
            {bike.avg_mileage ? `${bike.avg_mileage} km/l` : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}

// A quiet, brand-consistent illustration (winding road + a speed-line motif)
// instead of a stock/AI-generated motorcycle photo. Renders per-bike in a
// distinct accent so a multi-bike garage doesn't look identical card to card.
function RouteMotif({ accent }) {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 256" preserveAspectRatio="xMidYMid slice" fill="none">
      <path d="M-20 210 C 60 170, 90 230, 170 190 S 300 120, 420 150" stroke={accent} strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 14" />
      <path d="M-20 150 C 80 90, 140 160, 230 110 S 360 40, 430 70" stroke="#FFFFFF" strokeOpacity="0.08" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 12" />
      <circle cx="230" cy="110" r="3" fill={accent} fillOpacity="0.6" />
      <circle cx="340" cy="60" r="2" fill="#FFFFFF" fillOpacity="0.25" />
      <g opacity="0.5">
        <circle cx="60" cy="60" r="60" stroke={accent} strokeOpacity="0.15" strokeWidth="1" />
        <circle cx="60" cy="60" r="40" stroke={accent} strokeOpacity="0.12" strokeWidth="1" />
      </g>
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}
