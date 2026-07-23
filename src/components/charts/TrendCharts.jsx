// Lightweight, dependency-free SVG charts. Kept custom (rather than pulling
// in recharts/chart.js) so the APK build stays small and fast to bundle.

export function BarTrend({ data, valueKey = 'value', labelKey = 'label', height = 140, color = '#F2A93B' }) {
  const max = Math.max(1, ...data.map((d) => d[valueKey]))
  const barW = 100 / data.length
  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
        {data.map((d, i) => {
          const h = (d[valueKey] / max) * (height - 24)
          const x = i * barW
          return (
            <g key={i}>
              <rect
                x={x + barW * 0.2}
                y={height - 24 - h}
                width={barW * 0.6}
                height={Math.max(h, 2)}
                rx="2"
                fill={color}
                opacity={d[valueKey] === max ? 1 : 0.55}
              />
            </g>
          )
        })}
      </svg>
      <div className="flex mt-1">
        {data.map((d, i) => (
          <div key={i} style={{ width: `${barW}%` }} className="text-center text-[10px] font-semibold text-ink/40 dark:text-white/40">
            {d[labelKey]}
          </div>
        ))}
      </div>
    </div>
  )
}

export function LineTrend({ data, valueKey = 'value', labelKey = 'label', height = 120, color = '#2FB6A6' }) {
  if (data.length === 0) return null
  const values = data.map((d) => d[valueKey])
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const stepX = data.length > 1 ? 100 / (data.length - 1) : 0
  const pad = 10
  const points = data.map((d, i) => {
    const x = data.length > 1 ? i * stepX : 50
    const y = pad + (1 - (d[valueKey] - min) / range) * (height - pad * 2)
    return `${x},${y}`
  })

  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
        <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => {
          const [x, y] = p.split(',')
          return <circle key={i} cx={x} cy={y} r="1.6" fill={color} />
        })}
      </svg>
      <div className="flex mt-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[10px] font-semibold text-ink/40 dark:text-white/40">
            {d[labelKey]}
          </div>
        ))}
      </div>
    </div>
  )
}

export function DonutBreakdown({ data, size = 120, strokeWidth = 16 }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 shrink-0">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-black/5 dark:text-white/10" strokeWidth={strokeWidth} />
        {data.map((d, i) => {
          const frac = d.value / total
          const dash = frac * c
          const circle = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          )
          offset += dash
          return circle
        })}
      </svg>
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="flex-1 truncate text-ink/70 dark:text-white/70">{d.label}</span>
            <span className="font-semibold">{Math.round((d.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
