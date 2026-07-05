import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useBikes } from '../context/BikeContext'
import { useTable } from '../hooks/useTable'
import ThemeToggle from '../components/ThemeToggle.jsx'
import LogFuelModal from '../components/modals/LogFuelModal.jsx'
import LogExpenseModal from '../components/modals/LogExpenseModal.jsx'
import LogTripModal from '../components/modals/LogTripModal.jsx'
import AddReminderModal from '../components/modals/AddReminderModal.jsx'
import AddBikeModal from '../components/modals/AddBikeModal.jsx'
import { formatINR, formatDate } from '../lib/format'
import { visualFor } from '../lib/categoryVisual'

export default function Garage() {
  const { profile, user } = useAuth()
  const { bikes, activeBike, setActiveBikeId, addBike } = useBikes()
  const [modal, setModal] = useState(null)

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

      <div
        className="relative rounded-2xl overflow-hidden h-64 mb-6 flex flex-col justify-end p-5 text-white bg-cover bg-center"
        style={{ backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0.1)), url(${activeBike.photo_url || 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=1200'})` }}
      >
        {activeBike.make && (
          <span className="absolute top-4 left-4 bg-white/90 text-ink text-xs font-semibold px-3 py-1 rounded-full">{activeBike.make.split(' ')[0]}</span>
        )}
        <h2 className="text-2xl font-display font-extrabold">{activeBike.name}</h2>
        <div className="flex gap-6 mt-2">
          <div>
            <p className="text-[10px] tracking-wide text-white/70 font-semibold">ODOMETER</p>
            <p className="font-bold">{Number(activeBike.odometer_km || 0).toLocaleString('en-IN')} km</p>
          </div>
          <div>
            <p className="text-[10px] tracking-wide text-white/70 font-semibold">AVG MILEAGE</p>
            <p className="font-bold">{activeBike.avg_mileage ? `${activeBike.avg_mileage} km/l` : '—'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card p-4">
          <p className="text-xs font-semibold text-ink/50 dark:text-white/50 tracking-wide">SPEND · THIS MONTH</p>
          <p className="text-2xl font-display font-extrabold mt-1">{formatINR(monthSpend)}</p>
          <p className="text-sm text-ink/50 dark:text-white/50 mt-1">Fuel {formatINR(monthFuel)}</p>
        </div>
        <div className="rounded-2xl bg-ink dark:bg-surface-darkmuted p-4 text-white">
          <p className="text-xs font-semibold text-amber tracking-wide">LIFETIME SPEND</p>
          <p className="text-2xl font-display font-extrabold mt-1">{formatINR(lifetimeSpend)}</p>
          <p className="text-sm text-white/60 mt-1">Across all logs</p>
        </div>
      </div>

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
                <span className="text-xl">🔧</span>
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
                <div className={`w-11 h-11 rounded-xl ${v.bg} flex items-center justify-center text-lg`}>{v.emoji}</div>
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
        <LogTripModal bikeName={activeBike.name} onClose={closeModal} onSave={(row) => trips.add(row)} />
      )}
      {modal === 'reminder' && (
        <AddReminderModal bikeName={activeBike.name} onClose={closeModal} onSave={(row) => reminders.add(row)} />
      )}
      {modal === 'addBike' && (
        <AddBikeModal onClose={closeModal} onSave={(row) => addBike(row)} />
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
function PlusIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg> }
