import {
  BookOpen,
  CalendarDays,
  FolderKanban,
  Home,
  Plus,
  Settings,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { OrbianLogo } from '@/components/brand/OrbianLogo'

const navItems = [
  { to: '/', label: 'Início', icon: Home },
  { to: '/cases', label: 'Casos', icon: FolderKanban },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/biblioteca', label: 'Biblioteca', icon: BookOpen },
  { to: '/profile', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
  const navigate = useNavigate()

  return (
    <aside className="sidebar" aria-label="Navegação principal">
      <div className="brand">
        <OrbianLogo size={38} />
        <div>
          <strong>Orbian.AI</strong>
          <small>LEGAL EXECUTION OS</small>
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

      <div className="sidebar-spacer" />

      <button className="new-exec-btn" onClick={() => navigate('/cases/new')}>
        <Plus size={18} />
        Nova Execução
      </button>
    </aside>
  )
}
