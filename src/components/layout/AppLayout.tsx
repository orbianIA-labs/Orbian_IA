import { Outlet } from 'react-router-dom'
import { CookieConsent } from '@/components/lgpd/CookieConsent'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'

export function AppLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="workspace">
        <TopBar />
        <main className="page-shell">
          <Outlet />
        </main>
      </div>
      <CookieConsent />
    </div>
  )
}
