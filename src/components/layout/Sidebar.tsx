import {
  BriefcaseBusiness,
  CalendarDays,
  FolderKanban,
  Home,
  UserCircle,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { OrbianLogo } from '@/components/brand/OrbianLogo'

const navItems = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/cases', label: 'Casos', icon: FolderKanban },
  { to: '/deadlines', label: 'Prazos', icon: CalendarDays },
  { to: '/admin', label: 'Planos', icon: BriefcaseBusiness },
  { to: '/profile', label: 'Perfil', icon: UserCircle },
]

export function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Navegacao principal">
      <div className="brand">
        <OrbianLogo size={36} />
        <div>
          <strong>Orbian</strong>
          <small>Execução jurídica</small>
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
