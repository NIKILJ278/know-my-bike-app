export default function Fab({ onClick, label = 'Add' }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="tap fixed z-30 w-16 h-16 rounded-full bg-amber shadow-fab flex items-center justify-center max-w-lg"
      style={{
        right: 'max(1.5rem, calc((100vw - 32rem) / 2 + 1.5rem))',
        bottom: 'calc(6rem + env(safe-area-inset-bottom))',
      }}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#12141C" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
    </button>
  )
}
