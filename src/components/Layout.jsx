import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav.jsx'

export default function Layout() {
  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark text-ink dark:text-white pb-24">
      <div className="max-w-lg mx-auto min-h-screen relative">
        <Outlet />
        <BottomNav />
      </div>
    </div>
  )
}
