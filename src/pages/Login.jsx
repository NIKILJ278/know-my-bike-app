import BikeLogo from '../components/BikeLogo.jsx'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import GoogleButton from '../components/GoogleButton.jsx'

export default function Login() {
  const { signInWithEmail, signInWithGoogle, authError, clearAuthError } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

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
    setBusy(true)
    const { error } = await signInWithEmail({ email, password })
    setBusy(false)
    if (error) setError(error.message)
    else navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-light dark:bg-bg-dark text-ink dark:text-white px-6 pt-16 pb-10">
      <div className="max-w-sm w-full mx-auto flex-1 flex flex-col">
        <BikeLogo size={40} className="text-ink dark:text-white mb-4" />
        <h1 className="text-3xl font-display font-extrabold">Welcome back</h1>
        <p className="text-ink/50 dark:text-white/50 mt-1 mb-8">Log in to keep riding with Know My Bike.</p>

        <GoogleButton onClick={async () => { const { error } = await signInWithGoogle(); if (error) setError(error.message) }} label="Continue with Google" />

        <div className="flex items-center gap-3 my-6">
          <div className="h-px bg-black/10 dark:bg-white/10 flex-1" />
          <span className="text-xs text-ink/40 dark:text-white/40">OR</span>
          <div className="h-px bg-black/10 dark:bg-white/10 flex-1" />
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <input className="input" type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <div className="relative">
            <input className="input pr-12" type={showPw ? 'text' : 'password'} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink/40 dark:text-white/40">
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>

          <div className="flex justify-end -mt-1">
            <Link to="/forgot-password" className="text-sm font-semibold text-amber-dark dark:text-amber">Forgot password?</Link>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button className="btn-primary mt-2" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        </form>

        <p className="text-center text-sm text-ink/50 dark:text-white/50 mt-8">
          New to Know My Bike? <Link to="/signup" className="font-semibold text-ink dark:text-white">Create an account</Link>
        </p>
      </div>
    </div>
  )
}
