import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Create a .env file — see .env.example.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})

/**
 * Creates a realtime channel that's safe from a specific, well-known
 * Supabase-js + React 18 StrictMode interaction: in dev, React mounts an
 * effect, cleans it up, then mounts it again in quick succession. If the
 * channel name is identical both times, Supabase-js can hand back the
 * still-tearing-down channel instance instead of a fresh one, and calling
 * `.on()` on an already-subscribed channel throws. Any pre-existing
 * channel sharing the same base name is removed first, and a fresh random
 * suffix (generated fresh per call, not memoized) guarantees the new one
 * is always a distinct instance. Use this for channels that are private
 * to this device (e.g. syncing this user's own data).
 */
export function freshChannel(baseName, options) {
  supabase.getChannels()
    .filter((c) => c.topic === `realtime:${baseName}` || c.topic.startsWith(`realtime:${baseName}:`))
    .forEach((c) => supabase.removeChannel(c))
  const unique = `${baseName}:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
  return supabase.channel(unique, options)
}

/**
 * Like freshChannel, but keeps the exact name unchanged — for channels
 * that must be identical across different users' devices (e.g. everyone
 * on the same ride joining the same signaling "room"). Only clears out
 * any stale local instance of this exact channel before recreating it.
 */
export function sharedChannel(name, options) {
  supabase.getChannels()
    .filter((c) => c.topic === `realtime:${name}`)
    .forEach((c) => supabase.removeChannel(c))
  return supabase.channel(name, options)
}
