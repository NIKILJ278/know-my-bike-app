import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const EMPTY = { fuel: [], expenses: [], trips: [], documents: [], reminders: [] }

/**
 * Unlike useTable (scoped to one bike), this pulls every log across every
 * bike the signed-in rider owns, so the Profile page can report whole-account
 * totals rather than just the active bike's numbers.
 */
export function useUserReport(bikeIds = []) {
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const key = bikeIds.slice().sort().join(',')

  const refresh = useCallback(async () => {
    if (!bikeIds.length) {
      setData(EMPTY)
      setLoading(false)
      return
    }
    setLoading(true)
    const [fuelRes, expRes, tripRes, docRes, remRes] = await Promise.all([
      supabase.from('fuel_logs').select('*').in('bike_id', bikeIds),
      supabase.from('expenses').select('*').in('bike_id', bikeIds),
      supabase.from('trips').select('*').in('bike_id', bikeIds),
      supabase.from('documents').select('*').in('bike_id', bikeIds),
      supabase.from('reminders').select('*').in('bike_id', bikeIds),
    ])
    setData({
      fuel: fuelRes.data || [],
      expenses: expRes.data || [],
      trips: tripRes.data || [],
      documents: docRes.data || [],
      reminders: remRes.data || [],
    })
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => { refresh() }, [refresh])

  return { ...data, loading, refresh }
}
