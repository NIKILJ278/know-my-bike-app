import { useState } from 'react'
import { useBikes } from '../context/BikeContext'
import { useTable } from '../hooks/useTable'
import AddDocumentModal from '../components/modals/AddDocumentModal.jsx'
import { formatDate, daysUntil } from '../lib/format'

const DOC_ICON = { Insurance: '🛡️', RC: '📄', PUC: '🌿', License: '🪪', Other: '📁' }

export default function Vault() {
  const { activeBike } = useBikes()
  const docs = useTable('documents', activeBike?.id)
  const [showModal, setShowModal] = useState(false)

  if (!activeBike) return null

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

      {docs.rows.length === 0 ? (
        <div className="flex flex-col items-center text-center py-16">
          <div className="w-20 h-20 rounded-full bg-surface-muted dark:bg-surface-darkmuted flex items-center justify-center text-3xl mb-4">🔒</div>
          <p className="font-bold text-lg mb-1">Nothing in your vault</p>
          <p className="text-ink/50 dark:text-white/50">Store insurance, RC and PUC details here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {docs.rows.map((d) => {
            const left = daysUntil(d.expiry_date)
            const isValid = left == null || left >= 0
            return (
              <div key={d.id} className="card p-4 border border-black/5 dark:border-white/10">
                <div className="flex justify-between items-start mb-6">
                  <span className="text-2xl">{DOC_ICON[d.doc_type] || '📁'}</span>
                  {d.expiry_date && (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isValid ? 'bg-pastel-green text-green-800' : 'bg-pastel-pink text-red-700'}`}>
                      {isValid ? 'Valid' : 'Expired'}
                    </span>
                  )}
                </div>
                <p className="font-bold">{d.doc_type}</p>
                <p className="text-sm text-ink/50 dark:text-white/50">{d.doc_number || (d.expiry_date ? `Expires ${formatDate(d.expiry_date)}` : '—')}</p>
              </div>
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
