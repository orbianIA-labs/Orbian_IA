import {
  BadgeDollarSign,
  CalendarDays,
  FileText,
  FolderKanban,
  Home,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/cases', label: 'Casos', icon: FolderKanban },
  { to: '/documents', label: 'Pecas', icon: FileText },
  { to: '/deadlines', label: 'Prazos', icon: CalendarDays },
  { to: '/clients', label: 'Clientes', icon: Users },
  { to: '/billing', label: 'Plano', icon: BadgeDollarSign },
  { to: '/lgpd', label: 'LGPD', icon: ShieldCheck },
]

export function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Navegacao principal">
      <div className="brand">
        <span className="brand-mark">L</span>
        <div>
          <strong>Lexio.IA</strong>
          <small>Beta operacional</small>
        </div>
      </div>

      <nav className="nav-list">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              end={item.to === '/'}
              key={item.to}
              to={item.to}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
