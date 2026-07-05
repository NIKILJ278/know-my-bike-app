import { useMemo, useState } from 'react'
import { useBikes } from '../context/BikeContext'
import { useTable } from '../hooks/useTable'
import Fab from '../components/Fab.jsx'
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

  const expenses = useTable('expenses', activeBike?.id)
  const fuel = useTable('fuel_logs', activeBike?.id)
  const trips = useTable('trips', activeBike?.id)

  const filteredExpenses = useMemo(
    () => (filter === 'All' ? expenses.rows : expenses.rows.filter((e) => e.category === filter)),
    [expenses.rows, filter]
  )

  if (!activeBike) return null

  return (
    <div className="px-6 pt-14">
      <h1 className="text-2xl font-display font-extrabold">Logbook</h1>
      <p className="text-ink/50 dark:text-white/50 mb-6">{activeBike.name}</p>

      <div className="flex bg-surface-muted dark:bg-surface-darkmuted rounded-full p-1 mb-4">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`pill-tab tap ${tab === t ? 'bg-white dark:bg-ink shadow-card' : 'text-ink/50 dark:text-white/50'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Expenses' && (
        <>
          <div className="flex gap-2 overflow-x-auto -mx-1 px-1 mb-4">
            {['All', ...EXPENSE_CATEGORIES].map((c) => (
              <button key={c} onClick={() => setFilter(c)}
                className={`chip ${filter === c ? 'bg-ink text-white border-ink dark:bg-white dark:text-ink dark:border-white' : 'border-black/10 dark:border-white/15'}`}>
                {c}
              </button>
            ))}
          </div>
          <ListOrEmpty
            rows={filteredExpenses}
            empty="No expenses logged yet."
            render={(r, i, arr) => (
              <Row key={r.id} last={i === arr.length - 1} icon={visualFor(r.category)}
                title={r.note || r.category} subtitle={`${formatDate(r.logged_at)} · ${r.category}`} amount={r.amount} />
            )}
          />
        </>
      )}

      {tab === 'Fuel' && (
        <ListOrEmpty
          rows={fuel.rows}
          empty="No fuel fills logged yet."
          render={(r, i, arr) => (
            <Row key={r.id} last={i === arr.length - 1} icon={visualFor('Fuel')}
              title={`${r.litres}L · ${r.full_tank ? 'Full Tank' : 'Partial'}`}
              subtitle={`${formatDate(r.logged_at)} · ${Number(r.odometer_km).toLocaleString('en-IN')} km${r.mileage ? ` · ${r.mileage} km/l` : ''}`}
              amount={r.amount} />
          )}
        />
      )}

      {tab === 'Trips' && (
        <ListOrEmpty
          rows={trips.rows}
          empty="No logs yet."
          emptyAction={() => setShowModal(true)}
          render={(r, i, arr) => (
            <Row key={r.id} last={i === arr.length - 1} icon={visualFor('Trip')}
              title={r.title}
              subtitle={`${formatDate(r.logged_at)} · ${r.distance_km} km${r.duration_min ? ` · ${r.duration_min} min` : ''}`}
              amount={null} />
          )}
        />
      )}

      <Fab onClick={() => setShowModal(true)} />

      {showModal && tab === 'Expenses' && (
        <LogExpenseModal bikeName={activeBike.name} onClose={() => setShowModal(false)} onSave={(row) => expenses.add(row)} />
      )}
      {showModal && tab === 'Fuel' && (
        <LogFuelModal bikeName={activeBike.name} onClose={() => setShowModal(false)} onSave={(row) => fuel.add(row)} />
      )}
      {showModal && tab === 'Trips' && (
        <LogTripModal bikeName={activeBike.name} onClose={() => setShowModal(false)} onSave={(row) => trips.add(row)} />
      )}
    </div>
  )
}

function ListOrEmpty({ rows, empty, render, emptyAction }) {
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
  return <div className="flex flex-col">{rows.map(render)}</div>
}

function Row({ icon, title, subtitle, amount, last }) {
  return (
    <div className={`flex items-center gap-3 py-3.5 ${last ? '' : 'border-b border-black/5 dark:border-white/10'}`}>
      <div className={`w-11 h-11 rounded-xl ${icon.bg} flex items-center justify-center text-lg shrink-0`}>{icon.emoji}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{title}</p>
        <p className="text-sm text-ink/50 dark:text-white/50">{subtitle}</p>
      </div>
      {amount != null && <p className="font-bold whitespace-nowrap">{formatINR(amount)}</p>}
    </div>
  )
}
