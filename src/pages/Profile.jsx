import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useBikes } from '../context/BikeContext'
import { useUserReport } from '../hooks/useUserReport'
import ThemeToggle from '../components/ThemeToggle.jsx'
import { formatINR, formatDate, daysUntil } from '../lib/format'
import { barColorFor } from '../lib/categoryVisual'

export default function Profile() {
  const { profile, user, signOut, updateProfile } = useAuth()
  const { bikes, deleteBike } = useBikes()
  const bikeIds = useMemo(() => bikes.map((b) => b.id), [bikes])
  const { fuel, expenses, trips, documents, reminders, loading, refresh } = useUserReport(bikeIds)

  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const handleDeleteBike = async (id) => {
    setDeletingId(id)
    await deleteBike(id)
    setDeletingId(null)
    setConfirmDeleteId(null)
  }

  const displayName = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'Rider'
  const email = profile?.email || user?.email || '—'
  const memberSinceRaw = profile?.created_at || user?.created_at
  const memberSince = memberSinceRaw ? formatDate(memberSinceRaw) : '—'
  const daysAsMember = memberSinceRaw
    ? Math.max(0, Math.floor((Date.now() - new Date(memberSinceRaw)) / 86400000))
    : null

  const startEditName = () => { setNameDraft(displayName); setEditingName(true) }
  const cancelEditName = () => setEditingName(false)
  const saveName = async () => {
    const trimmed = nameDraft.trim()
    if (!trimmed || trimmed === displayName) { setEditingName(false); return }
    setSavingName(true)
    await updateProfile({ username: trimmed })
    setSavingName(false)
    setEditingName(false)
  }

  const stats = useMemo(() => {
    const now = new Date()
    const inMonth = (d) => {
      const dt = new Date(d)
      return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear()
    }

    const fuelSpend = fuel.reduce((s, r) => s + Number(r.amount || 0), 0)
    const fuelLitres = fuel.reduce((s, r) => s + Number(r.litres || 0), 0)
    const expenseSpend = expenses.reduce((s, r) => s + Number(r.amount || 0), 0)
    const lifetimeSpend = fuelSpend + expenseSpend

    const monthFuel = fuel.filter((r) => inMonth(r.logged_at)).reduce((s, r) => s + Number(r.amount || 0), 0)
    const monthExpense = expenses.filter((r) => inMonth(r.logged_at)).reduce((s, r) => s + Number(r.amount || 0), 0)
    const monthSpend = monthFuel + monthExpense

    const totalDistance = trips.reduce((s, r) => s + Number(r.distance_km || 0), 0)
    const combinedOdometer = bikes.reduce((s, b) => s + Number(b.odometer_km || 0), 0)

    const mileageReadings = fuel.filter((r) => r.mileage).map((r) => Number(r.mileage))
    const avgMileage = mileageReadings.length
      ? Math.round((mileageReadings.reduce((s, m) => s + m, 0) / mileageReadings.length) * 10) / 10
      : null

    const categoryTotals = { Fuel: fuelSpend, Service: 0, Repair: 0, Insurance: 0, Accessories: 0, Other: 0 }
    expenses.forEach((e) => { categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount || 0) })
    const categoryBreakdown = Object.entries(categoryTotals)
      .filter(([, amt]) => amt > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({
        category,
        amount,
        pct: lifetimeSpend ? Math.round((amount / lifetimeSpend) * 100) : 0,
      }))

    const docStatus = (d) => {
      const left = daysUntil(d.expiry_date)
      if (left == null) return 'valid'
      if (left < 0) return 'expired'
      if (left < 30) return 'soon'
      return 'valid'
    }
    const docsValid = documents.filter((d) => docStatus(d) === 'valid').length
    const docsExpiringSoon = documents.filter((d) => docStatus(d) === 'soon').length
    const docsExpired = documents.filter((d) => docStatus(d) === 'expired').length

    const pendingReminders = reminders.filter((r) => !r.done).length

    return {
      fuelSpend, fuelLitres, expenseSpend, lifetimeSpend, monthSpend, monthFuel,
      totalDistance, combinedOdometer, avgMileage, categoryBreakdown,
      docsValid, docsExpiringSoon, docsExpired, pendingReminders,
      totalTrips: trips.length, totalFuelFills: fuel.length,
      totalExpenses: expenses.length, totalDocuments: documents.length,
    }
  }, [fuel, expenses, trips, documents, reminders, bikes])

  const bikeReports = useMemo(() => bikes.map((b) => {
    const bikeFuel = fuel.filter((r) => r.bike_id === b.id)
    const bikeExpenses = expenses.filter((r) => r.bike_id === b.id)
    const spend = bikeFuel.reduce((s, r) => s + Number(r.amount || 0), 0) + bikeExpenses.reduce((s, r) => s + Number(r.amount || 0), 0)
    return { ...b, spend }
  }), [bikes, fuel, expenses])

  if (!bikes.length) return null

  return (
    <div className="px-6 pt-14 pb-4">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-extrabold">Profile</h1>
          <p className="text-ink/50 dark:text-white/50">Your full riding report</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            aria-label="Refresh report"
            className="tap w-11 h-11 rounded-full flex items-center justify-center bg-surface-muted dark:bg-surface-darkmuted"
          >
            <RefreshIcon spinning={loading} />
          </button>
          <ThemeToggle />
        </div>
      </div>

      {/* Identity card */}
      <div className="card p-5 mb-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-ink dark:bg-white text-white dark:text-ink flex items-center justify-center text-2xl font-bold shrink-0">
          {displayName[0]?.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                className="input py-2 text-base font-semibold"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                maxLength={40}
                autoFocus
              />
              <button onClick={saveName} disabled={savingName} className="tap text-sm font-semibold text-amber-dark dark:text-amber shrink-0">
                {savingName ? '…' : 'Save'}
              </button>
              <button onClick={cancelEditName} className="tap text-sm text-ink/40 dark:text-white/40 shrink-0">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="font-display font-extrabold text-lg truncate">{displayName}</p>
              <button onClick={startEditName} aria-label="Edit name" className="tap text-ink/30 dark:text-white/30 shrink-0">
                <EditIcon />
              </button>
            </div>
          )}
          <p className="text-sm text-ink/50 dark:text-white/50 truncate">{email}</p>
          <p className="text-xs text-ink/40 dark:text-white/40 mt-1">
            Member since {memberSince}{daysAsMember != null ? ` · ${daysAsMember} days riding with us` : ''}
          </p>
        </div>
      </div>

      {/* Quick stat tiles */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatTile label="BIKES OWNED" value={bikes.length} icon={<BikeIcon />} />
        <StatTile label="DISTANCE LOGGED" value={`${stats.totalDistance.toLocaleString('en-IN')} km`} icon={<RoadIcon />} />
        <StatTile label="LIFETIME SPEND" value={formatINR(stats.lifetimeSpend)} icon={<WalletIcon />} dark />
        <StatTile label="AVG MILEAGE" value={stats.avgMileage ? `${stats.avgMileage} km/l` : '—'} icon={<GaugeIcon />} />
      </div>

      {/* Spend snapshot */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card p-4">
          <p className="text-xs font-semibold text-ink/50 dark:text-white/50 tracking-wide">SPEND · THIS MONTH</p>
          <p className="text-2xl font-display font-extrabold mt-1">{formatINR(stats.monthSpend)}</p>
          <p className="text-sm text-ink/50 dark:text-white/50 mt-1">Fuel {formatINR(stats.monthFuel)}</p>
        </div>
        <div className="rounded-2xl bg-ink dark:bg-surface-darkmuted p-4 text-white">
          <p className="text-xs font-semibold text-amber tracking-wide">FUEL FILLED</p>
          <p className="text-2xl font-display font-extrabold mt-1">{stats.fuelLitres.toFixed(1)} L</p>
          <p className="text-sm text-white/60 mt-1">{stats.totalFuelFills} fill-ups logged</p>
        </div>
      </div>

      {/* Spending breakdown */}
      <section className="mb-6">
        <h3 className="font-display font-bold text-lg mb-3">Spending breakdown</h3>
        {stats.categoryBreakdown.length === 0 ? (
          <p className="text-ink/40 dark:text-white/40 text-sm">Nothing logged yet — your report fills in as you go.</p>
        ) : (
          <div className="card p-4 flex flex-col gap-4">
            {stats.categoryBreakdown.map((c) => (
              <div key={c.category}>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="text-sm font-semibold">{c.category}</span>
                  <span className="text-sm font-bold">
                    {formatINR(c.amount)} <span className="text-ink/40 dark:text-white/40 font-medium">· {c.pct}%</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${c.pct}%`, backgroundColor: barColorFor(c.category) }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Activity summary */}
      <section className="mb-6">
        <h3 className="font-display font-bold text-lg mb-3">Activity summary</h3>
        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="Fuel fills" value={stats.totalFuelFills} />
          <MiniStat label="Trips" value={stats.totalTrips} />
          <MiniStat label="Expenses" value={stats.totalExpenses} />
          <MiniStat label="Documents" value={stats.totalDocuments} />
          <MiniStat label="Reminders due" value={stats.pendingReminders} />
          <MiniStat label="Odometer total" value={`${stats.combinedOdometer.toLocaleString('en-IN')} km`} />
        </div>
      </section>

      {/* Document status */}
      <section className="mb-6">
        <h3 className="font-display font-bold text-lg mb-3">Document status</h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="card p-3 text-center">
            <p className="text-xl font-display font-extrabold text-green-700 dark:text-green-400">{stats.docsValid}</p>
            <p className="text-[10px] text-ink/50 dark:text-white/50 font-semibold mt-0.5">VALID</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-xl font-display font-extrabold text-amber-dark dark:text-amber">{stats.docsExpiringSoon}</p>
            <p className="text-[10px] text-ink/50 dark:text-white/50 font-semibold mt-0.5">EXPIRING SOON</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-xl font-display font-extrabold text-red-600 dark:text-red-400">{stats.docsExpired}</p>
            <p className="text-[10px] text-ink/50 dark:text-white/50 font-semibold mt-0.5">EXPIRED</p>
          </div>
        </div>
      </section>

      {/* My garage */}
      <section className="mb-8">
        <h3 className="font-display font-bold text-lg mb-3">My garage</h3>
        <div className="flex flex-col gap-2">
          {bikeReports.map((b) => (
            <div key={b.id} className="card p-4">
              {confirmDeleteId === b.id ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">Remove {b.name}?</p>
                    <p className="text-sm text-ink/50 dark:text-white/50">This deletes all its fuel, expense, trip and document records too.</p>
                  </div>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="tap text-sm font-semibold text-ink/50 dark:text-white/50 shrink-0"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteBike(b.id)}
                    disabled={deletingId === b.id}
                    className="tap text-sm font-semibold text-red-600 dark:text-red-400 shrink-0"
                  >
                    {deletingId === b.id ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-pastel-yellow flex items-center justify-center text-lg shrink-0">🏍️</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{b.name}</p>
                    <p className="text-sm text-ink/50 dark:text-white/50 truncate">
                      {b.make ? `${b.make} · ` : ''}{Number(b.odometer_km || 0).toLocaleString('en-IN')} km
                      {b.avg_mileage ? ` · ${b.avg_mileage} km/l` : ''}
                    </p>
                  </div>
                  <p className="font-bold whitespace-nowrap">{formatINR(b.spend)}</p>
                  <button
                    onClick={() => setConfirmDeleteId(b.id)}
                    aria-label={`Remove ${b.name}`}
                    className="tap text-ink/30 dark:text-white/30 shrink-0 ml-1"
                  >
                    <TrashIcon />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Account actions */}
      <section>
        <button
          onClick={async () => { setSigningOut(true); await signOut() }}
          disabled={signingOut}
          className="btn-dark"
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
        <p className="text-center text-xs text-ink/30 dark:text-white/30 mt-4">Know My Bike · v1.0.0</p>
      </section>
    </div>
  )
}

function StatTile({ label, value, icon, dark }) {
  return (
    <div className={`p-4 rounded-2xl flex flex-col gap-3 ${dark ? 'bg-ink dark:bg-surface-darkmuted text-white' : 'card'}`}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${dark ? 'bg-white/10' : 'bg-white dark:bg-white/10'}`}>
        {icon}
      </div>
      <div>
        <p className="text-xl font-display font-extrabold">{value}</p>
        <p className={`text-[11px] font-semibold tracking-wide mt-0.5 ${dark ? 'text-amber' : 'text-ink/50 dark:text-white/50'}`}>{label}</p>
      </div>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="card p-3 text-center">
      <p className="text-lg font-display font-extrabold truncate">{value}</p>
      <p className="text-[10px] text-ink/50 dark:text-white/50 font-semibold mt-0.5 leading-tight">{label.toUpperCase()}</p>
    </div>
  )
}

function BikeIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="17" r="3" /><circle cx="19" cy="17" r="3" /><path d="M5 17 9 8h4l3 5h4M9 8 7 5H4" /></svg>
}
function RoadIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20 9 4h6l5 16" /><path d="M12 4v16" strokeDasharray="2 3" /></svg>
}
function WalletIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="14" rx="2" /><path d="M2 10h20" /><circle cx="17" cy="15" r="1" fill="currentColor" stroke="none" /></svg>
}
function GaugeIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15a8 8 0 1 1 16 0" /><path d="M12 15l4-4" /></svg>
}
function EditIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
}
function TrashIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>
}
function RefreshIcon({ spinning }) {
  return <svg className={spinning ? 'animate-spin' : ''} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" /></svg>
}
