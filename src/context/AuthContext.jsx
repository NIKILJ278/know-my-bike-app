import { createContext, useContext, useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

// Must match the custom URL scheme used in capacitor.config.json ("appId" + "://login-callback")
// and must also be added to Supabase Dashboard > Authentication > URL Configuration > Redirect URLs.
const NATIVE_REDIRECT_URL = 'com.knowmybike.app://login-callback'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Native only: Google sign-in opens the system browser (Custom Tabs), and
  // once the user approves, the OS hands control back to the app via this
  // custom URL scheme instead of a normal http(s) redirect. Catch it here
  // and hand the auth code to Supabase to finish the login.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const sub = CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
      if (!url.startsWith(NATIVE_REDIRECT_URL)) return
      await Browser.close().catch(() => {})
      const { data, error } = await supabase.auth.exchangeCodeForSession(url)
      if (!error && data?.session) setSession(data.session)
    })
    return () => { sub.remove() }
  }, [])

  useEffect(() => {
    if (!session?.user) { setProfile(null); return }
    let active = true
    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => { if (active) setProfile(data) })
    return () => { active = false }
  }, [session?.user?.id])

  // ---- Email / password ----
  const signUpWithEmail = async ({ email, password, username }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    })
    return { data, error }
  }

  const signInWithEmail = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  // ---- Google OAuth ----
  const signInWithGoogle = async () => {
    const isNative = Capacitor.isNativePlatform()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: isNative ? NATIVE_REDIRECT_URL : window.location.origin,
        skipBrowserRedirect: isNative,
      },
    })
    if (!error && isNative && data?.url) {
      await Browser.open({ url: data.url })
    }
    return { data, error }
  }

  // ---- OTP-based password reset ----
  // Step 1: send a 6-digit code to the user's email.
  // NOTE: In Supabase Dashboard > Authentication > Email Templates > "Reset Password",
  // make sure the template includes {{ .Token }} so the email shows a numeric code.
  const requestPasswordReset = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email)
    return { data, error }
  }

  // Step 2: verify the code the user typed in.
  const verifyResetOtp = async ({ email, token }) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'recovery',
    })
    return { data, error }
  }

  // Step 3: once verified, the user has a temporary session — set the new password.
  const updatePassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword })
    return { data, error }
  }

  const signOut = () => supabase.auth.signOut()

  // ---- Profile (used by the Profile dashboard's inline "edit name") ----
  const updateProfile = async (patch) => {
    if (!session?.user) return { error: new Error('Not signed in') }
    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', session.user.id)
      .select()
      .single()
    if (!error) setProfile(data)
    return { data, error }
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    requestPasswordReset,
    verifyResetOtp,
    updatePassword,
    updateProfile,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
