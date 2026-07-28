import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { watchSpeed, watchHeading, requestHeadingPermission } from '../lib/location'

const MAX_GAUGE = 160 // km/h — sweep maxes out here, matches typical bike dashboards

const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
const headingLabel = (deg) => CARDINALS[Math.round(deg / 45) % 8]

export default function Speedometer() {
  const navigate = useNavigate()
  // `speed` is the raw target value from GPS; `displaySpeed` is what's
  // actually rendered, animated smoothly toward `speed` every frame so the
  // needle/number feel instantly responsive instead of snapping in
  // whenever a new (infrequent) GPS fix arrives.
  const [speed, setSpeed] = useState(0)
  const [displaySpeed, setDisplaySpeed] = useState(0)
  const [maxSpeed, setMaxSpeed] = useState(0)
  const [accuracy, setAccuracy] = useState(null)
  const [error, setError] = useState('')
  const [tracking, setTracking] = useState(false)
  const [lastFixAt, setLastFixAt] = useState(null)
  const [fixAgeMs, setFixAgeMs] = useState(null)

  const [heading, setHeading] = useState(null)
  const [displayHeading, setDisplayHeading] = useState(0)
  const [headingBlocked, setHeadingBlocked] = useState(false)

  const stopRef = useRef(null)
  const stopHeadingRef = useRef(null)
  const rafRef = useRef(null)
  const speedRef = useRef(0)
  const headingRef = useRef(null)

  useEffect(() => { speedRef.current = speed }, [speed])
  useEffect(() => { headingRef.current = heading }, [heading])

  // GPS speed
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

  // Compass heading
  useEffect(() => {
    let cancelled = false
    const start = async () => {
      const allowed = await requestHeadingPermission()
      if (cancelled) return
      if (!allowed) { setHeadingBlocked(true); return }
      stopHeadingRef.current = watchHeading((deg) => { if (!cancelled) setHeading(deg) })
    }
    start()
    return () => { cancelled = true; stopHeadingRef.current?.() }
  }, [])

  // Smooth animation loop: eases displaySpeed/displayHeading toward the
  // latest raw readings every frame (~60fps) instead of only updating on
  // each GPS fix, which is what made the gauge feel sluggish before.
  useEffect(() => {
    const tick = () => {
      setDisplaySpeed((prev) => {
        const target = speedRef.current
        const diff = target - prev
        if (Math.abs(diff) < 0.05) return target
        // Big jumps (a real speed change just arrived from GPS) close
        // fast so the number doesn't visibly crawl toward the real
        // reading; small jumps ease gently so single-fix noise doesn't
        // make the needle twitch.
        const factor = Math.abs(diff) > 6 ? 0.55 : 0.25
        return prev + diff * factor
      })
      setDisplayHeading((prev) => {
        const target = headingRef.current
        if (target == null) return prev
        let diff = target - prev
        if (diff > 180) diff -= 360
        if (diff < -180) diff += 360
        if (Math.abs(diff) < 0.3) return target
        return (prev + diff * 0.3 + 360) % 360
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  const enableCompass = async () => {
    const allowed = await requestHeadingPermission()
    setHeadingBlocked(!allowed)
    if (allowed) stopHeadingRef.current = watchHeading((deg) => setHeading(deg))
  }

  const resetMax = () => setMaxSpeed(0)

  const pct = Math.min(displaySpeed / MAX_GAUGE, 1)
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
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`w-1.5 h-1.5 rounded-full ${error ? 'bg-red-400' : tracking ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
          <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">
            {error ? 'GPS unavailable' : tracking ? 'GPS live' : 'Starting GPS…'}
          </p>
        </div>

        <Gauge speed={displaySpeed} sweepDeg={sweepDeg} max={MAX_GAUGE} />

        <div className="flex gap-10 mt-6">
          <div className="text-center">
            <p className="text-2xl font-display font-extrabold">{maxSpeed.toFixed(0)}</p>
            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wide mt-0.5">Top speed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-display font-extrabold">{accuracy ? `±${accuracy.toFixed(0)}m` : '—'}</p>
            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wide mt-0.5">GPS accuracy</p>
          </div>
        </div>

        <div className="w-full max-w-xs mt-8 rounded-3xl bg-white/[0.04] border border-white/10 px-6 py-6 flex flex-col items-center">
          <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wide mb-4">Compass</p>
          {headingBlocked ? (
            <button onClick={enableCompass} className="chip border-white/15 text-white/70">Enable compass</button>
          ) : (
            <Compass heading={displayHeading} rawHeading={heading} />
          )}
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

function Compass({ heading, rawHeading }) {
  const size = 132
  const c = size / 2
  const r = c - 10

  if (rawHeading == null) {
    return (
      <div className="flex flex-col items-center gap-2 opacity-50">
        <div style={{ width: size, height: size }} className="rounded-full border-2 border-white/20 flex items-center justify-center">
          <CompassIcon />
        </div>
        <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Waiting for compass…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div style={{ width: size, height: size }} className="relative rounded-full border-2 border-white/15 bg-white/5">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
          {['N', 'E', 'S', 'W'].map((label, i) => {
            const angle = i * 90
            const rad = (angle * Math.PI) / 180
            const x = c + (r - 12) * Math.sin(rad)
            const y = c - (r - 12) * Math.cos(rad)
            return (
              <text key={label} x={x} y={y} fill={label === 'N' ? '#F2A93B' : '#ffffff55'} fontSize="13" fontWeight="800" textAnchor="middle" dominantBaseline="middle">
                {label}
              </text>
            )
          })}
          {/* Needle rotates opposite to heading so it always points toward true North */}
          <g transform={`rotate(${-heading} ${c} ${c})`}>
            <path d={`M ${c} ${c - r + 12} L ${c - 6} ${c} L ${c} ${c - 7} L ${c + 6} ${c} Z`} fill="#F2A93B" />
            <path d={`M ${c} ${c + r - 12} L ${c - 5} ${c} L ${c} ${c + 6} L ${c + 5} ${c} Z`} fill="#ffffff55" />
          </g>
          <circle cx={c} cy={c} r="4" fill="#ffffff" />
        </svg>
      </div>
      <p className="text-base font-display font-bold text-white/85 mt-1">{Math.round(heading)}° {headingLabel(heading)}</p>
    </div>
  )
}

function CompassIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-white/40">
      <circle cx="12" cy="12" r="9" />
      <path d="m14.5 9.5-2 5-2.5-2.5z" />
    </svg>
  )
}

function BackIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
}
