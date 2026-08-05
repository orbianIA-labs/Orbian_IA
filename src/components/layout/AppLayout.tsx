import { Outlet, useLocation } from 'react-router-dom'
import { CookieConsent } from '@/components/lgpd/CookieConsent'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { Toaster } from '@/components/ui/Toaster'

export function AppLayout() {
  const location = useLocation()
  const isInicio = location.pathname === '/'

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="workspace">
        {isInicio && <TopBar />}
        <main className="page-shell">
          <Outlet />
        </main>
      </div>
      <CookieConsent />
      <Toaster />
    </div>
  )
}
