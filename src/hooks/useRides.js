import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export function useRides() {
  const { user } = useAuth()
  const [rides, setRides] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) { setRides([]); setLoading(false); return }
    const { data } = await supabase
      .from('rides')
      .select('*, ride_members(count)')
      .order('created_at', { ascending: false })
    setRides(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('rides-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_members' }, () => refresh())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, refresh])

  const startRide = async (name) => {
    const { data: ride, error } = await supabase.from('rides').insert({ host_id: user.id, name }).select().single()
    if (error) return { error }
    await supabase.from('ride_members').insert({ ride_id: ride.id, user_id: user.id, username: 'You', status: 'joined' })
    refresh()
    return { data: ride }
  }

  return { rides, loading, startRide, refresh }
}

export function useRide(rideId) {
  const { user } = useAuth()
  const [ride, setRide] = useState(null)
  const [members, setMembers] = useState([])
  const [stops, setStops] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!rideId) return
    const [{ data: rideData }, { data: memberData }, { data: stopData }] = await Promise.all([
      supabase.from('rides').select('*').eq('id', rideId).single(),
      supabase.from('ride_members').select('*').eq('ride_id', rideId).order('created_at'),
      supabase.from('ride_stops').select('*').eq('ride_id', rideId).order('order_index'),
    ])
    setRide(rideData || null)
    setMembers(memberData || [])
    setStops(stopData || [])
    setLoading(false)
  }, [rideId])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    if (!rideId) return
    const channel = supabase
      .channel(`ride-${rideId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_members', filter: `ride_id=eq.${rideId}` }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_stops', filter: `ride_id=eq.${rideId}` }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides', filter: `id=eq.${rideId}` }, () => refresh())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [rideId, refresh])

  const inviteByPhoneOrCode = async (query) => {
    const { data: found, error: lookupErr } = await supabase.rpc('find_profile_for_invite', { query })
    if (lookupErr) return { error: lookupErr }
    if (!found || found.length === 0) return { error: { message: 'No Know My Bike user found with that phone number or invite code.' } }
    const target = found[0]
    const { error } = await supabase.from('ride_members').insert({ ride_id: rideId, user_id: target.id, username: target.username, status: 'invited' })
    if (!error) refresh()
    return { error, data: target }
  }

  const respondToInvite = async (accept) => {
    const { error } = await supabase.from('ride_members').update({ status: accept ? 'joined' : 'declined' }).eq('ride_id', rideId).eq('user_id', user.id)
    if (!error) refresh()
    return { error }
  }

  const addStop = async (stop) => {
    const { error } = await supabase.from('ride_stops').insert({ ...stop, ride_id: rideId, added_by: user.id, order_index: stops.length })
    if (!error) refresh()
    return { error }
  }

  const removeStop = async (id) => {
    const { error } = await supabase.from('ride_stops').delete().eq('id', id)
    if (!error) refresh()
    return { error }
  }

  const setStatus = async (status) => {
    const { error } = await supabase.from('rides').update({ status }).eq('id', rideId)
    if (!error) refresh()
    return { error }
  }

  const myMembership = members.find((m) => m.user_id === user?.id)

  return { ride, members, stops, myMembership, loading, refresh, inviteByPhoneOrCode, respondToInvite, addStop, removeStop, setStatus }
}
