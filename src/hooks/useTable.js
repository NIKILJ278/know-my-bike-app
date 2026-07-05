import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * Generic hook: subscribes to realtime changes on `table` for a given bike_id,
 * keeping local state in sync automatically (insert/update/delete).
 */
export function useTable(table, bikeId, orderBy = { column: 'created_at', ascending: false }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!bikeId) { setRows([]); setLoading(false); return }
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('bike_id', bikeId)
      .order(orderBy.column, { ascending: orderBy.ascending })
    if (!error) setRows(data || [])
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, bikeId])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    if (!bikeId) return
    const channel = supabase
      .channel(`${table}-${bikeId}`)
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

  return { rows, loading, add, update, remove, refresh }
}
