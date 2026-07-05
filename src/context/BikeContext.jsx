import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'

const BikeContext = createContext(null)

export function BikeProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const [bikes, setBikes] = useState([])
  const [activeBikeId, setActiveBikeId] = useState(() => localStorage.getItem('know-my-bike-active-bike'))
  const [loading, setLoading] = useState(true)

  const refreshBikes = useCallback(async () => {
    if (authLoading) return // auth session hasn't resolved yet — don't decide anything early
    if (!user) { setBikes([]); setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('bikes')
      .select('*')
      .order('created_at', { ascending: true })
    if (!error && data) {
      setBikes(data)
      if (!activeBikeId && data.length) setActiveBikeId(data[0].id)
    }
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading])

  useEffect(() => { refreshBikes() }, [refreshBikes])

  // Realtime: keep garage in sync across devices/tabs
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('bikes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bikes', filter: `owner_id=eq.${user.id}` },
        () => refreshBikes())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, refreshBikes])

  useEffect(() => {
    if (activeBikeId) localStorage.setItem('know-my-bike-active-bike', activeBikeId)
  }, [activeBikeId])

  const activeBike = bikes.find((b) => b.id === activeBikeId) || bikes[0] || null

  const addBike = async (bike) => {
    const { data, error } = await supabase
      .from('bikes')
      .insert({ ...bike, owner_id: user.id })
      .select()
      .single()
    if (!error) {
      await refreshBikes()
      setActiveBikeId(data.id)
    }
    return { data, error }
  }

  const updateBike = async (id, patch) => {
    const { data, error } = await supabase.from('bikes').update(patch).eq('id', id).select().single()
    if (!error) refreshBikes()
    return { data, error }
  }

  const deleteBike = async (id) => {
    const { error } = await supabase.from('bikes').delete().eq('id', id)
    if (!error) {
      setBikes((prev) => {
        const next = prev.filter((b) => b.id !== id)
        if (activeBikeId === id) {
          const fallback = next[0]?.id || null
          setActiveBikeId(fallback)
          if (fallback) localStorage.setItem('know-my-bike-active-bike', fallback)
          else localStorage.removeItem('know-my-bike-active-bike')
        }
        return next
      })
      refreshBikes()
    }
    return { error }
  }

  const value = { bikes, activeBike, activeBikeId, setActiveBikeId, addBike, updateBike, deleteBike, loading, refreshBikes }
  return <BikeContext.Provider value={value}>{children}</BikeContext.Provider>
}

export const useBikes = () => useContext(BikeContext)
