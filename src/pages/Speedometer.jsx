import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { watchSpeed } from '../lib/location'

const MAX_GAUGE = 160 // km/h — sweep maxes out here, matches typical bike dashboards

export default function Speedometer() {
  const navigate = useNavigate()
  const [speed, setSpeed] = useState(0)
  const [maxSpeed, setMaxSpeed] = useState(0)
  const [accuracy, setAccuracy] = useState(null)
  const [error, setError] = useState('')
  const [tracking, setTracking] = useState(false)
  const stopRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    setTracking(true)
    watchSpeed(
      (fix) => {
        if (cancelled) return
        setSpeed(fix.speedKmh)
        setAccuracy(fix.accuracy)
        setMaxSpeed((prev) => Math.max(prev, fix.speedKmh))
        setError('')
      },
      (err) => { if (!cancelled) setError(err.message || 'Lost GPS signal.') }
    ).then((stop) => { stopRef.current = stop })

    return () => { cancelled = true; stopRef.current?.(); setTracking(false) }
  }, [])

  const resetMax = () => setMaxSpeed(0)

  const pct = Math.min(speed / MAX_GAUGE, 1)
  const sweepDeg = pct * 270 // gauge sweeps 270° (like a real dashboard dial)

  return (
    <div className="min-h-screen bg-ink text-white flex flex-col px-6 pt-14 pb-10">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => navigate(-1)} className="tap w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
          <BackIcon />
        </button>
        <p className="text-sm font-semibold text-white/50">Speedometer</p>
        <button onClick={resetMax} className="text-sm font-semibold text-amber">Reset</button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <Gauge speed={speed} sweepDeg={sweepDeg} max={MAX_GAUGE} />

        <div className="flex gap-10 mt-8">
          <div className="text-center">
            <p className="text-2xl font-display font-extrabold">{maxSpeed.toFixed(0)}</p>
            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wide mt-0.5">Top speed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-display font-extrabold">{accuracy ? `±${accuracy.toFixed(0)}m` : '—'}</p>
            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wide mt-0.5">GPS accuracy</p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400 mt-6 text-center max-w-xs">{error}</p>
        )}
        {!error && speed === 0 && tracking && (
          <p className="text-xs text-white/30 mt-6 text-center max-w-xs">
            Speed reads 0 until you're moving — GPS speed only updates while in motion, outdoors, with a clear sky view.
          </p>
        )}
      </div>
    </div>
  )
}

function Gauge({ speed, sweepDeg, max }) {
  const r = 120
  const cx = 140
  const cy = 140
  const startAngle = -225 // dial starts at bottom-left
  const totalSweep = 270

  const polarToXY = (angleDeg) => {
    const rad = (angleDeg * Math.PI) / 180
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
  }
  const arcPath = (fromDeg, toDeg) => {
    const [x1, y1] = polarToXY(fromDeg)
    const [x2, y2] = polarToXY(toDeg)
    const large = toDeg - fromDeg > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
  }

  const ticks = Array.from({ length: 9 }, (_, i) => {
    const val = Math.round((max / 8) * i)
    const angle = startAngle + (totalSweep * i) / 8
    const [x, y] = polarToXY(angle)
    return { val, x, y }
  })

  return (
    <svg width="280" height="230" viewBox="0 0 280 230">
      <path d={arcPath(startAngle, startAngle + totalSweep)} fill="none" stroke="#ffffff1a" strokeWidth="14" strokeLinecap="round" />
      <path d={arcPath(startAngle, startAngle + sweepDeg)} fill="none" stroke="#F2A93B" strokeWidth="14" strokeLinecap="round" />
      {ticks.map((t, i) => (
        <text key={i} x={t.x} y={t.y} fill="#ffffff55" fontSize="11" fontWeight="700" textAnchor="middle" dominantBaseline="middle">{t.val}</text>
      ))}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="52" fontWeight="800" fill="#ffffff" fontFamily="inherit">{speed.toFixed(0)}</text>
      <text x={cx} y={cy + 22} textAnchor="middle" fontSize="13" fontWeight="600" fill="#ffffff88">km/h</text>
    </svg>
  )
}

function BackIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
}
