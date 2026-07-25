import { useMemo, useState } from 'react'
import { useBikes } from '../context/BikeContext'
import { useTable } from '../hooks/useTable'
import Fab from '../components/Fab.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import LogFuelModal from '../components/modals/LogFuelModal.jsx'
import LogExpenseModal, { EXPENSE_CATEGORIES } from '../components/modals/LogExpenseModal.jsx'
import LogTripModal from '../components/modals/LogTripModal.jsx'
import { formatINR, formatDate } from '../lib/format'
import { visualFor } from '../lib/categoryVisual'

const TABS = ['Expenses', 'Fuel', 'Trips']

export default function Logbook() {
  const { activeBike } = useBikes()
  const [tab, setTab] = useState('Expenses')
  const [filter, setFilter] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const expenses = useTable('expenses', activeBike?.id)
  const fuel = useTable('fuel_logs', activeBike?.id)
  const trips = useTable('trips', activeBike?.id)

  const tableForTab = { Expenses: expenses, Fuel: fuel, Trips: trips }[tab]

  const filteredExpenses = useMemo(
    () => (filter === 'All' ? expenses.rows : expenses.rows.filter((e) => e.category === filter)),
    [expenses.rows, filter]
  )

  const rowsForTab = { Expenses: filteredExpenses, Fuel: fuel.rows, Trips: trips.rows }[tab]

  if (!activeBike) return null

  const switchTab = (t) => { setTab(t); exitSelectMode() }
  const exitSelectMode = () => { setSelectMode(false); setSelected(new Set()) }
  const toggleSelected = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const runDelete = async () => {
    setDeleting(true)
    await Promise.all(Array.from(selected).map((id) => tableForTab.remove(id)))
    setDeleting(false)
    setConfirmOpen(false)
    exitSelectMode()
  }

  return (
    <div className="px-6 pt-14 pb-4">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-extrabold">Logbook</h1>
          <p className="text-ink/50 dark:text-white/50">{activeBike.name}</p>
        </div>
        {rowsForTab.length > 0 && (
          <button
            onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
            className="text-sm font-semibold text-amber-dark dark:text-amber pt-1"
          >
            {selectMode ? 'Cancel' : 'Select'}
          </button>
        )}
      </div>

      <div className="flex bg-surface-muted dark:bg-surface-darkmuted rounded-full p-1 mb-4">
        {TABS.map((t) => (
          <button key={t} onClick={() => switchTab(t)} className={`pill-tab tap ${tab === t ? 'bg-white dark:bg-ink shadow-card' : 'text-ink/50 dark:text-white/50'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Expenses' && (
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 mb-4">
          {['All', ...EXPENSE_CATEGORIES].map((c) => (
            <button key={c} onClick={() => setFilter(c)}
              className={`chip ${filter === c ? 'bg-ink text-white border-ink dark:bg-white dark:text-ink dark:border-white' : 'border-black/10 dark:border-white/15'}`}>
              {c}
            </button>
          ))}
        </div>
      )}

      {tab === 'Expenses' && (
        <ListOrEmpty
          rows={filteredExpenses}
          empty="No expenses logged yet."
          extraBottomPad={selectMode && selected.size > 0}
          render={(r, i, arr) => (
            <Row key={r.id} last={i === arr.length - 1} icon={visualFor(r.category)}
              title={r.note || r.category} subtitle={`${formatDate(r.logged_at)} · ${r.category}`} amount={r.amount}
              selectMode={selectMode} selected={selected.has(r.id)} onToggle={() => toggleSelected(r.id)} />
          )}
        />
      )}

      {tab === 'Fuel' && (
        <ListOrEmpty
          rows={fuel.rows}
          empty="No fuel fills logged yet."
          extraBottomPad={selectMode && selected.size > 0}
          render={(r, i, arr) => (
            <Row key={r.id} last={i === arr.length - 1} icon={visualFor('Fuel')}
              title={`${r.litres}L · ${r.full_tank ? 'Full Tank' : 'Partial'}`}
              subtitle={`${formatDate(r.logged_at)} · ${Number(r.odometer_km).toLocaleString('en-IN')} km${r.mileage ? ` · ${r.mileage} km/l` : ''}`}
              amount={r.amount}
              selectMode={selectMode} selected={selected.has(r.id)} onToggle={() => toggleSelected(r.id)} />
          )}
        />
      )}

      {tab === 'Trips' && (
        <ListOrEmpty
          rows={trips.rows}
          empty="No logs yet."
          emptyAction={() => setShowModal(true)}
          extraBottomPad={selectMode && selected.size > 0}
          render={(r, i, arr) => (
            <Row key={r.id} last={i === arr.length - 1} icon={visualFor('Trip')}
              title={r.title}
              subtitle={`${formatDate(r.logged_at)} · ${r.distance_km} km${r.duration_min ? ` · ${r.duration_min} min` : ''}`}
              amount={null}
              selectMode={selectMode} selected={selected.has(r.id)} onToggle={() => toggleSelected(r.id)} />
          )}
        />
      )}

      {!selectMode && <Fab onClick={() => setShowModal(true)} />}

      {selectMode && selected.size > 0 && (
        <div
          className="fixed left-0 right-0 z-30 flex justify-center px-6"
          style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
        >
          <div className="w-full max-w-lg bg-ink dark:bg-white text-white dark:text-ink rounded-2xl px-5 py-4 flex items-center justify-between shadow-fab">
            <span className="font-semibold">{selected.size} selected</span>
            <button onClick={() => setConfirmOpen(true)} className="tap flex items-center gap-1.5 bg-red-500 text-white font-semibold text-sm px-4 py-2 rounded-full">
              <TrashIcon /> Delete
            </button>
          </div>
        </div>
      )}

      {confirmOpen && (
        <ConfirmDialog
          title={`Delete ${selected.size} log${selected.size > 1 ? 's' : ''}?`}
          message="This can't be undone. These entries will be permanently removed from your logbook."
          onCancel={() => setConfirmOpen(false)}
          onConfirm={runDelete}
          busy={deleting}
        />
      )}

      {showModal && tab === 'Expenses' && (
        <LogExpenseModal bikeName={activeBike.name} onClose={() => setShowModal(false)} onSave={(row) => expenses.add(row)} />
      )}
      {showModal && tab === 'Fuel' && (
        <LogFuelModal bikeName={activeBike.name} onClose={() => setShowModal(false)} onSave={(row) => fuel.add(row)} />
      )}
      {showModal && tab === 'Trips' && (
        <LogTripModal bikeName={activeBike.name} startOdometer={activeBike.odometer_km} onClose={() => setShowModal(false)} onSave={(row) => trips.add(row)} />
      )}
    </div>
  )
}

function ListOrEmpty({ rows, empty, render, emptyAction, extraBottomPad }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-16">
        <div className="w-20 h-20 rounded-full bg-surface-muted dark:bg-surface-darkmuted flex items-center justify-center text-3xl mb-4">🔍</div>
        <p className="font-bold text-lg mb-1">No logs yet</p>
        <p className="text-ink/50 dark:text-white/50 mb-6">Tap the + button to record your first entry.</p>
        {emptyAction && <button onClick={emptyAction} className="btn-dark w-auto px-6">Add Log</button>}
      </div>
    )
  }
  return <div className={`flex flex-col ${extraBottomPad ? 'pb-44' : 'pb-24'}`}>{rows.map(render)}</div>
}

function Row({ icon, title, subtitle, amount, last, selectMode, selected, onToggle }) {
  return (
    <button
      type="button"
      onClick={selectMode ? onToggle : undefined}
      className={`w-full flex items-center gap-3 py-3.5 text-left ${last ? '' : 'border-b border-black/5 dark:border-white/10'} ${selectMode ? 'tap' : ''}`}
    >
      {selectMode && (
        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? 'bg-amber border-amber' : 'border-black/20 dark:border-white/25'}`}>
          {selected && <CheckIcon />}
        </span>
      )}
      <div className={`w-11 h-11 rounded-xl ${icon.bg} flex items-center justify-center text-lg shrink-0`}>{icon.emoji}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{title}</p>
        <p className="text-sm text-ink/50 dark:text-white/50">{subtitle}</p>
      </div>
      {amount != null && <p className="font-bold whitespace-nowrap">{formatINR(amount)}</p>}
    </button>
  )
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#12141C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}
