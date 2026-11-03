import { useCallback, useEffect, useState } from 'react'
import { supabase, freshChannel } from '../lib/supabaseClient'

const cacheKey = (table, bikeId) => `kmb-cache:${table}:${bikeId}`

function readCache(table, bikeId) {
  try {
    const raw = localStorage.getItem(cacheKey(table, bikeId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeCache(table, bikeId, rows) {
  try {
    localStorage.setItem(cacheKey(table, bikeId), JSON.stringify(rows))
  } catch {
    // storage full or unavailable — not worth failing the app over
  }
}

/**
 * Generic hook: subscribes to realtime changes on `table` for a given
 * bike_id, keeping local state in sync automatically (insert/update/
 * delete). Also keeps a local cache of the last-known-good data, so your
 * bike's data is still visible (read-only) with no signal at all, instead
 * of showing an empty screen. Once the connection comes back, the next
 * successful fetch replaces the cache with live data automatically.
 */
export function useTable(table, bikeId, orderBy = { column: 'created_at', ascending: false }) {
  const [rows, setRows] = useState(() => (bikeId ? readCache(table, bikeId) || [] : []))
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)

  const refresh = useCallback(async () => {
    if (!bikeId) { setRows([]); setLoading(false); return }
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('bike_id', bikeId)
        .order(orderBy.column, { ascending: orderBy.ascending })
        .order('created_at', { ascending: orderBy.ascending })
      if (!error) {
        setRows(data || [])
        writeCache(table, bikeId, data || [])
        setOffline(false)
      } else {
        // Query reached the server but failed for some other reason (RLS,
        // bad filter, etc.) — don't silently wipe out what's on screen.
        setOffline(true)
      }
    } catch {
      // No network at all — keep showing whatever was last cached rather
      // than clearing the screen.
      setOffline(true)
    }
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, bikeId])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    if (!bikeId) return
    const channel = freshChannel(`${table}-${bikeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter: `bike_id=eq.${bikeId}` }, () => refresh())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [table, bikeId, refresh])

  const add = async (row) => {
    const { data, error } = await supabase.from(table).insert({ ...row, bike_id: bikeId }).select().single()
    if (!error) refresh()
    return { data, error }
  }

  const update = async (id, patch) => {
    const { data, error } = await supabase.from(table).update(patch).eq('id', id).select().single()
    if (!error) refresh()
    return { data, error }
  }

  const remove = async (id) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (!error) refresh()
    return { error }
  }

  return { rows, loading, offline, add, update, remove, refresh }
}
