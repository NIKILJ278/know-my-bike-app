import { useState } from 'react'
import { useBikes } from '../context/BikeContext'
import { useTable } from '../hooks/useTable'
import AddDocumentModal from '../components/modals/AddDocumentModal.jsx'
import { formatDate, daysUntil } from '../lib/format'
import { ShieldIcon, DocumentIcon, LeafIcon, IdCardIcon, FolderIcon, LockIcon } from '../components/icons/Icon.jsx'

const DOC_ICON = { Insurance: ShieldIcon, RC: DocumentIcon, PUC: LeafIcon, License: IdCardIcon, Other: FolderIcon }
const DOC_TINT = {
  Insurance: 'bg-pastel-green',
  RC: 'bg-pastel-blue',
  PUC: 'bg-pastel-yellow',
  License: 'bg-pastel-pink',
  Other: 'bg-surface-muted dark:bg-surface-darkmuted',
}

export default function Vault() {
  const { activeBike } = useBikes()
  const docs = useTable('documents', activeBike?.id)
  const [showModal, setShowModal] = useState(false)

  if (!activeBike) return null

  const summary = docs.rows.reduce(
    (acc, d) => {
      const left = daysUntil(d.expiry_date)
      if (left == null) return acc
      if (left < 0) acc.expired += 1
      else if (left <= 30) acc.expiring += 1
      else acc.valid += 1
      return acc
    },
    { valid: 0, expiring: 0, expired: 0 }
  )

  return (
    <div className="px-6 pt-14">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-extrabold">Vault</h1>
          <p className="text-ink/50 dark:text-white/50">{activeBike.name}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary w-auto px-5 py-2.5 flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Add
        </button>
      </div>

      {docs.rows.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-6">
          <StatusPill label="Valid" value={summary.valid} tone="text-green-600 dark:text-green-400" />
          <StatusPill label="Expiring soon" value={summary.expiring} tone="text-amber-dark dark:text-amber" />
          <StatusPill label="Expired" value={summary.expired} tone="text-red-500" />
        </div>
      )}

      {docs.rows.length === 0 ? (
        <div className="flex flex-col items-center text-center py-16">
          <div className="w-20 h-20 rounded-full bg-surface-muted dark:bg-surface-darkmuted flex items-center justify-center mb-4"><LockIcon size={28} className="text-ink/50 dark:text-white/50" /></div>
          <p className="font-bold text-lg mb-1">Nothing in your vault</p>
          <p className="text-ink/50 dark:text-white/50">Upload a document photo — insurance, RC, PUC and more.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {docs.rows.map((d) => {
            const left = daysUntil(d.expiry_date)
            const status = left == null ? null : left < 0 ? 'expired' : left <= 30 ? 'expiring' : 'valid'
            return (
              <a
                key={d.id}
                href={d.file_url || undefined}
                target="_blank"
                rel="noreferrer"
                className={`card overflow-hidden border border-black/5 dark:border-white/10 ${d.file_url ? 'tap' : ''}`}
              >
                {d.file_url ? (
                  <div className="relative h-28 w-full">
                    <img src={d.file_url} alt={d.doc_type} className="h-full w-full object-cover" />
                    <span className="absolute top-2 left-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center">
                      {(() => { const Icon = DOC_ICON[d.doc_type] || FolderIcon; return <Icon size={14} /> })()}
                    </span>
                  </div>
                ) : (
                  <div className={`h-28 w-full flex items-center justify-center ${DOC_TINT[d.doc_type] || DOC_TINT.Other}`}>
                    {(() => { const Icon = DOC_ICON[d.doc_type] || FolderIcon; return <Icon size={30} className="text-ink/70 dark:text-white/70" /> })()}
                  </div>
                )}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-bold">{d.doc_type}</p>
                    {status && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        status === 'valid' ? 'bg-pastel-green text-green-800' :
                        status === 'expiring' ? 'bg-pastel-yellow text-amber-dark' :
                        'bg-pastel-pink text-red-700'
                      }`}>
                        {status === 'valid' ? 'Valid' : status === 'expiring' ? 'Expiring' : 'Expired'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-ink/50 dark:text-white/50">{d.doc_number || (d.expiry_date ? `Expires ${formatDate(d.expiry_date)}` : '—')}</p>
                </div>
              </a>
            )
          })}
        </div>
      )}

      {showModal && (
        <AddDocumentModal bikeName={activeBike.name} onClose={() => setShowModal(false)} onSave={(row) => docs.add(row)} />
      )}
    </div>
  )
}

function StatusPill({ label, value, tone }) {
  return (
    <div className="card py-3 text-center">
      <p className={`text-xl font-display font-extrabold ${tone}`}>{value}</p>
      <p className="text-[10px] font-semibold text-ink/50 dark:text-white/50 tracking-wide uppercase mt-0.5">{label}</p>
    </div>
  )
}
