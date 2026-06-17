import {
  BriefcaseBusiness,
  CalendarDays,
  FolderKanban,
  Home,
  UserCircle,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/cases', label: 'Casos', icon: FolderKanban },
  { to: '/deadlines', label: 'Prazos', icon: CalendarDays },
  { to: '/admin', label: 'Administracao', icon: BriefcaseBusiness },
  { to: '/profile', label: 'Perfil', icon: UserCircle },
]

export function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Navegacao principal">
      <div className="brand">
        <span className="brand-mark">O</span>
        <div>
          <strong>Orbian</strong>
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
