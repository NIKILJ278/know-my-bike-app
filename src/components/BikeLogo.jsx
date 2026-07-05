// A clean, custom line-art motorcycle mark used as the app's logo.
// Replaces the previous 🏍️ emoji placeholder used across splash/auth
// screens, the garage list, and the browser favicon.
export default function BikeLogo({ size = 40, className = '', accent = '#F2A93B' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* rear + front wheels */}
      <circle cx="10.5" cy="34" r="7" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="34.5" cy="34" r="7" stroke="currentColor" strokeWidth="2.4" />
      {/* wheel hubs */}
      <circle cx="10.5" cy="34" r="1.6" fill="currentColor" />
      <circle cx="34.5" cy="34" r="1.6" fill="currentColor" />
      {/* frame */}
      <path
        d="M10.5 34 19 20h8l4 7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 20 24 27h10.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* seat */}
      <path d="M23 20h7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      {/* handlebar */}
      <path
        d="M27 20l3.5-5.5M27.5 14h4.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* headlight accent */}
      <circle cx="33.5" cy="15" r="1.8" fill={accent} />
    </svg>
  )
}
