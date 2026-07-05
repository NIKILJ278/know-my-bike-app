import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBikes } from '../context/BikeContext'
import { useAuth } from '../context/AuthContext'

export default function Onboarding() {
  const { addBike, bikes, loading: bikesLoading } = useBikes()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [make, setMake] = useState('')
  const [odometer, setOdometer] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Guard against landing here by mistake (e.g. a slow bikes fetch right after
  // sign-in): if it turns out we already have bikes, bounce back to the garage
  // instead of trapping the user on "add your first ride" forever.
  useEffect(() => {
    if (!bikesLoading && bikes.length > 0) navigate('/', { replace: true })
  }, [bikesLoading, bikes.length, navigate])

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    const { error } = await addBike({
      name, make, odometer_km: Number(odometer) || 0,
    })
    setBusy(false)
    if (error) return setError(error.message)
    navigate('/')
  }

  if (bikesLoading || bikes.length > 0) return null

  return (
    <div className="min-h-screen flex flex-col bg-bg-light dark:bg-bg-dark text-ink dark:text-white px-6 pt-16 pb-10">
      <div className="max-w-sm w-full mx-auto flex-1 flex flex-col">
        <div className="text-4xl mb-4">🏁</div>
        <h1 className="text-3xl font-display font-extrabold">Add your first ride</h1>
        <p className="text-ink/50 dark:text-white/50 mt-1 mb-8">Set up your garage to start logging fuel, service and trips.</p>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <input className="input" placeholder="Nickname — e.g. My Yamaha R15" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className="input" placeholder="Make & model — e.g. Yamaha R15 V4" value={make} onChange={(e) => setMake(e.target.value)} />
          <input className="input" type="number" inputMode="numeric" placeholder="Current odometer (km)" value={odometer} onChange={(e) => setOdometer(e.target.value)} />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button className="btn-primary mt-2" disabled={busy}>{busy ? 'Saving…' : 'Add to garage'}</button>
        </form>

        <button onClick={signOut} className="text-sm text-ink/40 dark:text-white/40 mt-10 self-center">Log out</button>
      </div>
    </div>
  )
}
