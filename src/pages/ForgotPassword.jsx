import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CheckCircleIcon } from '../components/icons/Icon.jsx'

const STEPS = { EMAIL: 1, OTP: 2, NEW_PW: 3, DONE: 4 }

export default function ForgotPassword() {
  const { requestPasswordReset, verifyResetOtp, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(STEPS.EMAIL)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const sendCode = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    const { error } = await requestPasswordReset(email)
    setBusy(false)
    if (error) return setError(error.message)
    setStep(STEPS.OTP)
  }

  const verifyCode = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    const { error } = await verifyResetOtp({ email, token: otp })
    setBusy(false)
    if (error) return setError(error.message)
    setStep(STEPS.NEW_PW)
  }

  const setNewPassword = async (e) => {
    e.preventDefault()
    setError('')
    if (pw.length < 6) return setError('Password must be at least 6 characters.')
    if (pw !== pw2) return setError('Passwords do not match.')
    setBusy(true)
    const { error } = await updatePassword(pw)
    setBusy(false)
    if (error) return setError(error.message)
    setStep(STEPS.DONE)
    setTimeout(() => navigate('/'), 1500)
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-light dark:bg-bg-dark text-ink dark:text-white px-6 pt-16 pb-10">
      <div className="max-w-sm w-full mx-auto flex-1 flex flex-col">
        <Link to="/login" className="tap mb-6 -ml-1 inline-block">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </Link>

        {step === STEPS.EMAIL && (
          <>
            <h1 className="text-3xl font-display font-extrabold">Reset password</h1>
            <p className="text-ink/50 dark:text-white/50 mt-1 mb-8">Enter your email and we'll send you a 6-digit code.</p>
            <form onSubmit={sendCode} className="flex flex-col gap-4">
              <input className="input" type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button className="btn-primary mt-2" disabled={busy}>{busy ? 'Sending…' : 'Send code'}</button>
            </form>
          </>
        )}

        {step === STEPS.OTP && (
          <>
            <h1 className="text-3xl font-display font-extrabold">Enter the code</h1>
            <p className="text-ink/50 dark:text-white/50 mt-1 mb-8">We emailed a 6-digit code to {email}.</p>
            <form onSubmit={verifyCode} className="flex flex-col gap-4">
              <input
                className="input text-center tracking-[0.5em] text-xl font-semibold"
                inputMode="numeric" maxLength={6} placeholder="000000"
                value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} required
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button className="btn-primary mt-2" disabled={busy}>{busy ? 'Verifying…' : 'Verify code'}</button>
              <button type="button" onClick={sendCode} className="text-sm font-semibold text-amber-dark dark:text-amber">Resend code</button>
            </form>
          </>
        )}

        {step === STEPS.NEW_PW && (
          <>
            <h1 className="text-3xl font-display font-extrabold">Set a new password</h1>
            <p className="text-ink/50 dark:text-white/50 mt-1 mb-8">Choose a strong password for your account.</p>
            <form onSubmit={setNewPassword} className="flex flex-col gap-4">
              <input className="input" type="password" placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} required />
              <input className="input" type="password" placeholder="Confirm new password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button className="btn-primary mt-2" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
            </form>
          </>
        )}

        {step === STEPS.DONE && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <CheckCircleIcon size={40} className="text-green-500 mb-4" />
            <h1 className="text-2xl font-display font-extrabold mb-2">Password updated</h1>
            <p className="text-ink/50 dark:text-white/50">Taking you into the app…</p>
          </div>
        )}
      </div>
    </div>
  )
}
