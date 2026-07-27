// A single, consistent icon language for the whole app — replaces raw OS
// emoji (which render differently per-device, look unfinished, and read
// as a prototype rather than a shipped product) with a custom line-icon
// set in one stroke weight/style, matching the icons already used in the
// bottom nav. Every icon takes the same { size, className } props so
// they're interchangeable wherever an icon is needed.

const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }

export function BikeIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <circle cx="5" cy="17" r="3" /><circle cx="19" cy="17" r="3" />
      <path d="M5 17 9 8h4l3 5h4M9 8 7 5H4" />
    </svg>
  )
}

export function WrenchIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M14.7 6.3a4 4 0 0 0-5.6 5.6L3 18l3 3 6.1-6.1a4 4 0 0 0 5.6-5.6l-2.5 2.5-2-2z" />
    </svg>
  )
}

export function FuelIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M3 22V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 10h10M16 8l3 3v6a1.5 1.5 0 0 0 3 0v-5l-2-2" />
      <path d="M3 22h10" />
    </svg>
  )
}

export function ShieldIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M12 2 4 5v6c0 5 3.4 8.6 8 11 4.6-2.4 8-6 8-11V5z" />
    </svg>
  )
}

export function BackpackIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M6 8a6 6 0 0 1 12 0v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1z" />
      <path d="M9 3v3h6V3M9 13h6M8 22v-4M16 22v-4" />
    </svg>
  )
}

export function PinIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M12 22s7-6.3 7-12a7 7 0 1 0-14 0c0 5.7 7 12 7 12z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

export function NoteIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M5 3h11l3 3v15H5z" /><path d="M16 3v3h3M8 11h8M8 15h8M8 19h4" />
    </svg>
  )
}

export function DocumentIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M6 2h9l4 4v16H6z" /><path d="M15 2v4h4M9 12h6M9 16h6" />
    </svg>
  )
}

export function LeafIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M20 4c-9 0-16 5-16 14 9 0 16-5 16-14z" /><path d="M6 18C10 12 14 9 20 4" />
    </svg>
  )
}

export function IdCardIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="12" r="2" />
      <path d="M13 10h6M13 14h4M4 19v-1a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v1" />
    </svg>
  )
}

export function FolderIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
    </svg>
  )
}

export function LockIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function SearchIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
    </svg>
  )
}

export function FlagIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M5 3v18M5 4h11l-2.5 4L16 12H5" />
    </svg>
  )
}

export function WarningIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M12 3 2 20h20z" /><path d="M12 10v4" /><circle cx="12" cy="17" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function MailIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <rect x="2" y="5" width="20" height="14" rx="2" /><path d="m3 6 9 7 9-7" />
    </svg>
  )
}

export function CheckCircleIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <circle cx="12" cy="12" r="9" /><path d="m8 12.5 2.5 2.5L16 9" />
    </svg>
  )
}

export function CheckIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="m20 6-11 11-5-5" />
    </svg>
  )
}

export function CloseIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  )
}

export function BotIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <rect x="4" y="8" width="16" height="12" rx="3" /><path d="M12 2v4M9 2h6" />
      <circle cx="9" cy="14" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="15" cy="14" r="1.4" fill="currentColor" stroke="none" />
      <path d="M9 17.5h6" />
    </svg>
  )
}
