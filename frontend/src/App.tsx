import { useEffect, useState } from 'react'
import { LandingPage } from './pages/LandingPage'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { AdminDashboard } from './pages/AdminDashboard'
import { useAdmin } from './hooks/useAdmin'

function AdminRoute() {
  const { session, loading } = useAdmin()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Đang tải...
      </div>
    )
  }
  return session ? <AdminDashboard /> : <AdminLoginPage />
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const handler = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  if (path.startsWith('/admin')) return <AdminRoute />
  return <LandingPage />
}
