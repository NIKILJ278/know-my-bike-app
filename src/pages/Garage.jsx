import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useBikes } from '../context/BikeContext'
import { useTable } from '../hooks/useTable'
import ThemeToggle from '../components/ThemeToggle.jsx'
import Sheet from '../components/Sheet.jsx'
import BikeHeroCard from '../components/BikeHeroCard.jsx'
import LogFuelModal from '../components/modals/LogFuelModal.jsx'
import LogExpenseModal from '../components/modals/LogExpenseModal.jsx'
import LogTripModal from '../components/modals/LogTripModal.jsx'
import AddReminderModal from '../components/modals/AddReminderModal.jsx'
import AddBikeModal from '../components/modals/AddBikeModal.jsx'
import { formatINR, formatDate } from '../lib/format'
import { visualFor, barColorFor } from '../lib/categoryVisual'
import { WrenchIcon } from '../components/icons/Icon.jsx'
import { BarTrend, LineTrend, DonutBreakdown } from '../components/charts/TrendCharts.jsx'

export default function Garage() {
  const { profile, user } = useAuth()
  const { bikes, activeBike, setActiveBikeId, addBike, updateBike } = useBikes()
  const [modal, setModal] = useState(null)
  const budget = activeBike?.monthly_budget ?? null
  const [budgetInput, setBudgetInput] = useState('')

  const fuel = useTable('fuel_logs', activeBike?.id)
  const expenses = useTable('expenses', activeBike?.id)
  const trips = useTable('trips', activeBike?.id)
  const reminders = useTable('reminders', activeBike?.id, { column: 'created_at', ascending: true })

  const displayName = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'Rider'

  const { monthSpend, monthFuel, lifetimeSpend } = useMemo(() => {
    const now = new Date()
    const inMonth = (d) => { const dt = new Date(d); return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear() }
    const fuelMonth = fuel.rows.filter((r) => inMonth(r.logged_at)).reduce((s, r) => s + Number(r.amount), 0)
    const expMonth = expenses.rows.filter((r) => inMonth(r.logged_at)).reduce((s, r) => s + Number(r.amount), 0)
    const fuelLife = fuel.rows.reduce((s, r) => s + Number(r.amount), 0)
    const expLife = expenses.rows.reduce((s, r) => s + Number(r.amount), 0)
    return { monthSpend: fuelMonth + expMonth, monthFuel: fuelMonth, lifetimeSpend: fuelLife + expLife }
  }, [fuel.rows, expenses.rows])

  const spendTrend = useMemo(() => {
    const months = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-IN', { month: 'short' }), value: 0 })
    }
    const byKey = Object.fromEntries(months.map((m) => [m.key, m]))
    const add = (logged_at, amount) => {
      const d = new Date(logged_at)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (byKey[key]) byKey[key].value += Number(amount)
    }
    fuel.rows.forEach((r) => add(r.logged_at, r.amount))
    expenses.rows.forEach((r) => add(r.logged_at, r.amount))
    return months
  }, [fuel.rows, expenses.rows])

  const mileageTrend = useMemo(() => {
    return fuel.rows
      .filter((r) => r.mileage)
      .sort((a, b) => Number(a.odometer_km) - Number(b.odometer_km))
      .slice(-8)
      .map((r) => ({ label: `${Number(r.odometer_km).toLocaleString('en-IN')}`, value: Number(r.mileage) }))
  }, [fuel.rows])

  const categoryBreakdown = useMemo(() => {
    const totals = {}
    if (monthFuel > 0) totals.Fuel = monthFuel
    expenses.rows
      .filter((r) => { const d = new Date(r.logged_at), now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
      .forEach((r) => { totals[r.category] = (totals[r.category] || 0) + Number(r.amount) })
    return Object.entries(totals)
      .map(([label, value]) => ({ label, value, color: barColorFor(label) }))
      .sort((a, b) => b.value - a.value)
  }, [expenses.rows, monthFuel])

  const recentActivity = useMemo(() => {
    const items = [
      ...fuel.rows.map((r) => ({ ...r, kind: 'Fuel', title: `${r.litres}L fuel${r.mileage ? ` · ${r.mileage} km/l` : ''}`, amount: r.amount, date: r.logged_at, category: 'Fuel' })),
      ...expenses.rows.map((r) => ({ ...r, kind: 'Expense', title: r.note || r.category, amount: r.amount, date: r.logged_at, category: r.category })),
    ]
    return items.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)
  }, [fuel.rows, expenses.rows])

  if (!activeBike) return null

  const closeModal = () => setModal(null)

  return (
    <div className="px-6 pt-14">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-extrabold">Hello, {displayName}</h1>
          <p className="text-ink/50 dark:text-white/50">Ride safe today.</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/profile" className="tap w-11 h-11 rounded-full bg-ink dark:bg-white text-white dark:text-ink flex items-center justify-center font-bold">
            {displayName[0]?.toUpperCase()}
          </Link>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 mb-4">
        {bikes.map((b) => (
          <button key={b.id} onClick={() => setActiveBikeId(b.id)}
            className={`chip ${b.id === activeBike.id ? 'bg-ink text-white border-ink dark:bg-white dark:text-ink dark:border-white' : 'border-black/10 dark:border-white/15'}`}>
            {b.name}
          </button>
        ))}
        <button onClick={() => setModal('addBike')} aria-label="Add another bike"
          className="chip border-black/10 dark:border-white/15 flex items-center gap-1 shrink-0">
          <PlusIcon /> Add bike
        </button>
      </div>

      <BikeHeroCard bike={activeBike} />

      <Link
        to="/speedometer"
        className="tap w-full flex items-center gap-3 bg-ink dark:bg-white text-white dark:text-ink rounded-2xl px-4 py-3.5 mb-6"
      >
        <span className="w-9 h-9 rounded-full bg-amber flex items-center justify-center shrink-0">
          <SpeedoIcon />
        </span>
        <span className="flex-1 text-left">
          <span className="block font-semibold text-sm">Speedometer</span>
          <span className="block text-xs opacity-60">Live GPS speed for this ride</span>
        </span>
        <ChevronIcon />
      </Link>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={() => { setBudgetInput(budget ? String(budget) : ''); setModal('budget') }}
          className="card p-4 text-left tap"
        >
          <p className="text-xs font-semibold text-ink/50 dark:text-white/50 tracking-wide">SPEND · THIS MONTH</p>
          <p className="text-2xl font-display font-extrabold mt-1">{formatINR(monthSpend)}</p>
          {budget ? (
            <>
              <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 mt-2.5 overflow-hidden">
                <div
                  className={`h-full transition-all ${monthSpend > budget ? 'bg-red-500' : 'bg-amber'}`}
                  style={{ width: `${Math.min(100, Math.round((monthSpend / budget) * 100))}%` }}
                />
              </div>
              <p className={`text-xs mt-1.5 ${monthSpend > budget ? 'text-red-500 font-semibold' : 'text-ink/50 dark:text-white/50'}`}>
                {monthSpend > budget ? 'Over budget · ' : ''}{formatINR(budget)} budget
              </p>
            </>
          ) : (
            <p className="text-sm text-ink/50 dark:text-white/50 mt-1">Fuel {formatINR(monthFuel)} · tap to set a budget</p>
          )}
        </button>
        <div className="rounded-2xl bg-ink dark:bg-surface-darkmuted p-4 text-white">
          <p className="text-xs font-semibold text-amber tracking-wide">LIFETIME SPEND</p>
          <p className="text-2xl font-display font-extrabold mt-1">{formatINR(lifetimeSpend)}</p>
          <p className="text-sm text-white/60 mt-1">Across all logs</p>
        </div>
      </div>

      {spendTrend.some((m) => m.value > 0) && (
        <div className="card p-4 mb-4">
          <p className="font-display font-bold mb-3">Spend · last 6 months</p>
          <BarTrend data={spendTrend} color="#F2A93B" />
        </div>
      )}

      {mileageTrend.length > 1 && (
        <div className="card p-4 mb-4">
          <p className="font-display font-bold mb-3">Mileage trend (km/l)</p>
          <LineTrend data={mileageTrend} color="#2FB6A6" />
        </div>
      )}

      {categoryBreakdown.length > 0 && (
        <div className="card p-4 mb-8">
          <p className="font-display font-bold mb-3">This month's spend by category</p>
          <DonutBreakdown data={categoryBreakdown} />
        </div>
      )}

      <div className="grid grid-cols-4 gap-2 mb-8">
        <QuickAction label="Log Fuel" onClick={() => setModal('fuel')} icon={<FuelIcon />} />
        <QuickAction label="Expense" onClick={() => setModal('expense')} icon={<ExpenseIcon />} />
        <QuickAction label="Trip" onClick={() => setModal('trip')} icon={<TripIcon />} />
        <QuickAction label="Reminder" onClick={() => setModal('reminder')} icon={<ReminderIcon />} />
      </div>

      {reminders.rows.length > 0 && (
        <section className="mb-8">
          <h3 className="font-display font-bold text-lg mb-3">Upcoming service</h3>
          <div className="flex flex-col gap-2">
            {reminders.rows.map((r) => (
              <div key={r.id} className="card px-4 py-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pastel-blue flex items-center justify-center shrink-0"><WrenchIcon size={17} className="text-blue-700" /></div>
                <div>
                  <p className="font-semibold">{r.title}</p>
                  <p className="text-sm text-ink/50 dark:text-white/50">
                    {r.due_km ? `Due at ${Number(r.due_km).toLocaleString('en-IN')} km` : r.due_date ? `By ${formatDate(r.due_date)}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-lg">Recent activity</h3>
          <Link to="/logbook" className="text-amber-dark dark:text-amber font-semibold text-sm">See all</Link>
        </div>
        <div className="flex flex-col">
          {recentActivity.length === 0 && (
            <p className="text-ink/40 dark:text-white/40 text-sm py-4">No activity yet — log your first fuel fill or expense.</p>
          )}
          {recentActivity.map((r, i) => {
            const v = visualFor(r.category)
            return (
              <div key={r.id} className={`flex items-center gap-3 py-3 ${i !== recentActivity.length - 1 ? 'border-b border-black/5 dark:border-white/10' : ''}`}>
                <div className={`w-11 h-11 rounded-xl ${v.bg} flex items-center justify-center`}><v.icon size={19} className={v.tint} /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{r.title}</p>
                  <p className="text-sm text-ink/50 dark:text-white/50">{formatDate(r.date)} · {r.category}</p>
                </div>
                <p className="font-bold">{formatINR(r.amount)}</p>
              </div>
            )
          })}
        </div>
      </section>

      {modal === 'fuel' && (
        <LogFuelModal bikeName={activeBike.name} onClose={closeModal} onSave={(row) => fuel.add(row)} />
      )}
      {modal === 'expense' && (
        <LogExpenseModal bikeName={activeBike.name} onClose={closeModal} onSave={(row) => expenses.add(row)} />
      )}
      {modal === 'trip' && (
        <LogTripModal bikeName={activeBike.name} startOdometer={activeBike.odometer_km} onClose={closeModal} onSave={(row) => trips.add(row)} />
      )}
      {modal === 'reminder' && (
        <AddReminderModal bikeName={activeBike.name} onClose={closeModal} onSave={(row) => reminders.add(row)} />
      )}
      {modal === 'addBike' && (
        <AddBikeModal onClose={closeModal} onSave={(row) => addBike(row)} />
      )}
      {modal === 'budget' && (
        <Sheet title="Monthly budget" subtitle={`For ${activeBike.name}`} onClose={closeModal}>
          <form
            onSubmit={(e) => { e.preventDefault(); updateBike(activeBike.id, { monthly_budget: Number(budgetInput) || null }); closeModal() }}
            className="flex flex-col gap-4"
          >
            <input
              className="input" type="number" inputMode="numeric" placeholder="e.g. 3000"
              value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} autoFocus
            />
            <p className="text-xs text-ink/40 dark:text-white/40 -mt-2">We'll show a progress bar on the dashboard and warn you when you go over.</p>
            <button className="btn-primary">Save Budget</button>
            {budget != null && (
              <button type="button" onClick={() => { updateBike(activeBike.id, { monthly_budget: null }); closeModal() }} className="text-sm text-red-500 font-semibold">
                Remove budget
              </button>
            )}
          </form>
        </Sheet>
      )}
    </div>
  )
}

function QuickAction({ label, icon, onClick }) {
  return (
    <button onClick={onClick} className="tap card flex flex-col items-center justify-center gap-2 py-4">
      {icon}
      <span className="text-xs font-semibold">{label}</span>
    </button>
  )
}

function FuelIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 22V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v18" /><path d="M3 10h9" /><path d="M14 8l3 2v7a2 2 0 0 0 4 0V9l-3-3" /></svg> }
function ExpenseIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 6v0M18 18v0" /></svg> }
function TripIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="2" /><circle cx="18" cy="18" r="2" /><path d="M8 6h8a2 2 0 0 1 2 2v8" strokeDasharray="3 3" /></svg> }
function ReminderIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /><circle cx="18" cy="6" r="3" fill="currentColor" stroke="none" /></svg> }
function SpeedoIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#12141C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a9 9 0 1 0 9 9" /><path d="M12 12 17 7" /><circle cx="12" cy="12" r="1.4" fill="#12141C" stroke="none" /></svg> }
function ChevronIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="opacity-40"><path d="m9 6 6 6-6 6" /></svg> }
function PlusIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg> }
