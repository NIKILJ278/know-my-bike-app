export default function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel, busy }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 px-6 pb-8 sm:pb-0" onClick={onCancel}>
      <div
        className="w-full max-w-sm bg-surface-light dark:bg-surface-dark rounded-2xl p-6 text-ink dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-display font-extrabold mb-1.5">{title}</h3>
        <p className="text-ink/60 dark:text-white/60 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="tap flex-1 rounded-2xl py-3 font-semibold border border-black/10 dark:border-white/15">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="tap flex-1 rounded-2xl py-3 font-semibold bg-red-500 text-white disabled:opacity-60"
          >
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
