import BikeLogo from '../components/BikeLogo.jsx'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import GoogleButton from '../components/GoogleButton.jsx'

export default function Signup() {
  const { signUpWithEmail, signInWithGoogle, authError, clearAuthError } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  // Surface Google/OAuth failures reported by Supabase after the redirect
  // back (e.g. "redirect URL not allowed") instead of failing silently.
  useEffect(() => {
    if (authError) {
      setError(authError)
      clearAuthError()
    }
  }, [authError])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    setBusy(true)
    const { error, data } = await signUpWithEmail({ email, password, username })
    setBusy(false)
    if (error) return setError(error.message)
    if (data?.session) navigate('/onboarding')
    else setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-8 bg-bg-light dark:bg-bg-dark text-ink dark:text-white">
        <div className="text-4xl mb-4">📬</div>
        <h1 className="text-2xl font-display font-extrabold mb-2">Confirm your email</h1>
        <p className="text-ink/50 dark:text-white/50 mb-8">We sent a confirmation link to {email}. Verify it, then log in.</p>
        <Link to="/login" className="btn-primary inline-block max-w-xs">Back to login</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-light dark:bg-bg-dark text-ink dark:text-white px-6 pt-16 pb-10">
      <div className="max-w-sm w-full mx-auto flex-1 flex flex-col">
        <BikeLogo size={40} className="text-ink dark:text-white mb-4" />
        <h1 className="text-3xl font-display font-extrabold">Create your account</h1>
        <p className="text-ink/50 dark:text-white/50 mt-1 mb-8">Track fuel, service and every rupee spent on your ride.</p>

        <GoogleButton onClick={async () => { const { error } = await signInWithGoogle(); if (error) setError(error.message) }} label="Sign up with Google" />

        <div className="flex items-center gap-3 my-6">
          <div className="h-px bg-black/10 dark:bg-white/10 flex-1" />
          <span className="text-xs text-ink/40 dark:text-white/40">OR</span>
          <div className="h-px bg-black/10 dark:bg-white/10 flex-1" />
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <input className="input" type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <input className="input" type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="Password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <input className="input" type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button className="btn-primary mt-2" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        </form>

        <p className="text-center text-sm text-ink/50 dark:text-white/50 mt-8">
          Already have an account? <Link to="/login" className="font-semibold text-ink dark:text-white">Log in</Link>
        </p>
      </div>
    </div>
  )
}
