export default function Sheet({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-bg-light dark:bg-bg-dark text-ink dark:text-white overflow-y-auto">
      <div className="max-w-lg mx-auto px-6 pt-6 pb-10">
        <button onClick={onClose} aria-label="Close" className="tap mb-6 -ml-1">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
        <h1 className="text-2xl font-display font-extrabold">{title}</h1>
        {subtitle && <p className="text-ink/50 dark:text-white/50 mt-1">{subtitle}</p>}
        <div className="h-px bg-black/10 dark:bg-white/10 my-6" />
        {children}
      </div>
    </div>
  )
}
