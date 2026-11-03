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
import { exportToCSV } from '../lib/exportCSV'

const TABS = ['Expenses', 'Fuel', 'Trips']

export default function Logbook() {
  const { activeBike } = useBikes()
  const [tab, setTab] = useState('Expenses')
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const expenses = useTable('expenses', activeBike?.id, { column: 'logged_at', ascending: false })
  const fuel = useTable('fuel_logs', activeBike?.id, { column: 'logged_at', ascending: false })
  const trips = useTable('trips', activeBike?.id, { column: 'logged_at', ascending: false })

  const tableForTab = { Expenses: expenses, Fuel: fuel, Trips: trips }[tab]

  const q = query.trim().toLowerCase()

  const filteredExpenses = useMemo(() => {
    let rows = filter === 'All' ? expenses.rows : expenses.rows.filter((e) => e.category === filter)
    if (q) rows = rows.filter((r) => `${r.note || ''} ${r.category}`.toLowerCase().includes(q))
    return rows
  }, [expenses.rows, filter, q])

  const filteredFuel = useMemo(() => {
    if (!q) return fuel.rows
    return fuel.rows.filter((r) => `${r.litres}L ${r.full_tank ? 'full tank' : 'partial'}`.toLowerCase().includes(q))
  }, [fuel.rows, q])

  const filteredTrips = useMemo(() => {
    if (!q) return trips.rows
    return trips.rows.filter((r) => `${r.title || ''} ${r.end_place || ''}`.toLowerCase().includes(q))
  }, [trips.rows, q])

  const rowsForTab = { Expenses: filteredExpenses, Fuel: filteredFuel, Trips: filteredTrips }[tab]

  if (!activeBike) return null

  const switchTab = (t) => { setTab(t); exitSelectMode(); setQuery('') }
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

  const handleRowTap = (row) => {
    if (selectMode) return toggleSelected(row.id)
    setEditingRow(row)
  }

  const exportCurrentTab = () => {
    exportToCSV(`${activeBike.name}-${tab.toLowerCase()}.csv`, rowsForTab)
  }

  return (
    <div className="px-6 pt-14 pb-4">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-extrabold">Logbook</h1>
          <p className="text-ink/50 dark:text-white/50">{activeBike.name}</p>
        </div>
        <div className="flex items-center gap-4 pt-1">
          {rowsForTab.length > 0 && !selectMode && (
            <button onClick={exportCurrentTab} aria-label="Export CSV" className="text-ink/50 dark:text-white/50">
              <ExportIcon />
            </button>
          )}
          {tableForTab.rows.length > 0 && (
            <button
              onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
              className="text-sm font-semibold text-amber-dark dark:text-amber"
            >
              {selectMode ? 'Cancel' : 'Select'}
            </button>
          )}
        </div>
      </div>

      <div className="flex bg-surface-muted dark:bg-surface-darkmuted rounded-full p-1 mb-4">
        {TABS.map((t) => (
          <button key={t} onClick={() => switchTab(t)} className={`pill-tab tap ${tab === t ? 'bg-white dark:bg-ink shadow-card' : 'text-ink/50 dark:text-white/50'}`}>
            {t}
          </button>
        ))}
      </div>

      {tableForTab.rows.length > 3 && (
        <div className="relative mb-4">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30 dark:text-white/30" />
          <input
            className="input pl-10"
            placeholder={`Search ${tab.toLowerCase()}…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

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
          empty={q ? 'No expenses match your search.' : 'No expenses logged yet.'}
          extraBottomPad={selectMode && selected.size > 0}
          render={(r, i, arr) => (
            <Row key={r.id} last={i === arr.length - 1} icon={visualFor(r.category)}
              title={r.note || r.category} subtitle={`${formatDate(r.logged_at)} · ${r.category}`} amount={r.amount}
              selectMode={selectMode} selected={selected.has(r.id)} onTap={() => handleRowTap(r)} />
          )}
        />
      )}

      {tab === 'Fuel' && (
        <ListOrEmpty
          rows={filteredFuel}
          empty={q ? 'No fuel fills match your search.' : 'No fuel fills logged yet.'}
          extraBottomPad={selectMode && selected.size > 0}
          render={(r, i, arr) => (
            <Row key={r.id} last={i === arr.length - 1} icon={visualFor('Fuel')}
              title={`${r.litres}L · ${r.full_tank ? 'Full Tank' : 'Partial'}`}
              subtitle={`${formatDate(r.logged_at)} · ${Number(r.odometer_km).toLocaleString('en-IN')} km${r.mileage ? ` · ${r.mileage} km/l` : ''}`}
              amount={r.amount}
              selectMode={selectMode} selected={selected.has(r.id)} onTap={() => handleRowTap(r)} />
          )}
        />
      )}

      {tab === 'Trips' && (
        <ListOrEmpty
          rows={filteredTrips}
          empty={q ? 'No trips match your search.' : 'No logs yet.'}
          emptyAction={() => setShowModal(true)}
          extraBottomPad={selectMode && selected.size > 0}
          render={(r, i, arr) => (
            <Row key={r.id} last={i === arr.length - 1} icon={visualFor('Trip')}
              title={r.title}
              subtitle={`${formatDate(r.logged_at)} · ${r.distance_km} km${r.duration_min ? ` · ${r.duration_min} min` : ''}`}
              amount={null}
              selectMode={selectMode} selected={selected.has(r.id)} onTap={() => handleRowTap(r)} />
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

      {editingRow && tab === 'Expenses' && (
        <LogExpenseModal bikeName={activeBike.name} initial={editingRow} onClose={() => setEditingRow(null)} onSave={(patch) => expenses.update(editingRow.id, patch)} />
      )}
      {editingRow && tab === 'Fuel' && (
        <LogFuelModal bikeName={activeBike.name} initial={editingRow} onClose={() => setEditingRow(null)} onSave={(patch) => fuel.update(editingRow.id, patch)} />
      )}
      {editingRow && tab === 'Trips' && (
        <LogTripModal bikeName={activeBike.name} startOdometer={activeBike.odometer_km} initial={editingRow} onClose={() => setEditingRow(null)} onSave={(patch) => trips.update(editingRow.id, patch)} />
      )}
    </div>
  )
}

function ListOrEmpty({ rows, empty, render, emptyAction, extraBottomPad }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-16">
        <div className="w-20 h-20 rounded-full bg-surface-muted dark:bg-surface-darkmuted flex items-center justify-center mb-4"><SearchIcon size={28} className="text-ink/50 dark:text-white/50" /></div>
        <p className="font-bold text-lg mb-1">No logs yet</p>
        <p className="text-ink/50 dark:text-white/50 mb-6">{empty}</p>
        {emptyAction && <button onClick={emptyAction} className="btn-dark w-auto px-6">Add Log</button>}
      </div>
    )
  }
  return <div className={`flex flex-col ${extraBottomPad ? 'pb-44' : 'pb-24'}`}>{rows.map(render)}</div>
}

function Row({ icon, title, subtitle, amount, last, selectMode, selected, onTap }) {
  return (
    <button
      type="button"
      onClick={onTap}
      className={`w-full flex items-center gap-3 py-3.5 text-left tap ${last ? '' : 'border-b border-black/5 dark:border-white/10'}`}
    >
      {selectMode && (
        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? 'bg-amber border-amber' : 'border-black/20 dark:border-white/25'}`}>
          {selected && <CheckIcon />}
        </span>
      )}
      <div className={`w-11 h-11 rounded-xl ${icon.bg} flex items-center justify-center shrink-0`}><icon.icon size={19} className={icon.tint} /></div>
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

function SearchIcon({ className, size = 16 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function ExportIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15V3M8 7l4-4 4 4" /><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
    </svg>
  )
}
