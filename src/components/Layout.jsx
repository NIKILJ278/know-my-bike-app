import { Outlet } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import BottomNav from './BottomNav.jsx'
import { useBikes } from '../context/BikeContext'
import { useUserReport } from '../hooks/useUserReport'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { scheduleExpiryNotifications } from '../lib/notifications'

function NotificationsBridge() {
  const { bikes } = useBikes()
  const bikeIds = bikes.map((b) => b.id)
  const { documents, reminders, loading } = useUserReport(bikeIds)
  const scheduledKey = useRef('')

  useEffect(() => {
    if (loading) return
    const key = `${documents.length}-${reminders.length}-${documents.map((d) => d.expiry_date).join(',')}`
    if (key === scheduledKey.current) return
    scheduledKey.current = key
    scheduleExpiryNotifications(documents, reminders)
  }, [documents, reminders, loading])

  return null
}

export default function Layout() {
  const online = useOnlineStatus()
  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark text-ink dark:text-white pb-24">
      <div className="max-w-lg mx-auto min-h-screen relative">
        <NotificationsBridge />
        {!online && (
          <div className="sticky top-0 z-50 bg-amber text-ink text-xs font-semibold text-center py-1.5">
            You're offline — showing your last saved data
          </div>
        )}
        <Outlet />
        <BottomNav />
      </div>
    </div>
  )
}
