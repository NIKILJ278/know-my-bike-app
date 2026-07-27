import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Layout from './components/Layout.jsx'
import Garage from './pages/Garage.jsx'
import Logbook from './pages/Logbook.jsx'
import Vault from './pages/Vault.jsx'
import AskAI from './pages/AskAI.jsx'
import Profile from './pages/Profile.jsx'
import Rides from './pages/Rides.jsx'
import RideRoom from './pages/RideRoom.jsx'
import Speedometer from './pages/Speedometer.jsx'
import GlobalRingOverlay from './components/GlobalRingOverlay.jsx'
import Wordmark from './components/Wordmark.jsx'
import { useBikes } from './context/BikeContext'

function Splash() {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center gap-3 bg-bg-light dark:bg-bg-dark">
      <Wordmark size={30} className="text-ink dark:text-white animate-pulse" />
    </div>
  )
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Splash />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RequireBike({ children }) {
  const { bikes, loading } = useBikes()
  if (loading) return <Splash />
  if (bikes.length === 0) return <Navigate to="/onboarding" replace />
  return children
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <Splash />

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to="/" replace /> : <Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route
        path="/onboarding"
        element={<RequireAuth><Onboarding /></RequireAuth>}
      />
      <Route
        path="/"
        element={
          <RequireAuth>
            <RequireBike>
              <GlobalRingOverlay />
              <Layout />
            </RequireBike>
          </RequireAuth>
        }
      >
        <Route index element={<Garage />} />
        <Route path="logbook" element={<Logbook />} />
        <Route path="vault" element={<Vault />} />
        <Route path="rides" element={<Rides />} />
        <Route path="rides/:id" element={<RideRoom />} />
        <Route path="ask-ai" element={<AskAI />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route
        path="/speedometer"
        element={<RequireAuth><RequireBike><Speedometer /></RequireBike></RequireAuth>}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
