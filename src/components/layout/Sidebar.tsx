import { CalendarDays, ChevronDown, FolderKanban, Home, Settings, Zap } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { OrbianLogo } from '@/components/brand/OrbianLogo'
import { useAuthStore } from '@/store/authStore'

function initials(name?: string) {
  if (!name) return 'O'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

const navItems = [
  { to: '/', label: 'Início', icon: Home },
  { to: '/trabalho', label: 'Trabalho', icon: Zap },
  { to: '/cases', label: 'Casos', icon: FolderKanban },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/profile', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
  const user = useAuthStore((s) => s.user)

  return (
    <aside className="sidebar" aria-label="Navegacao principal">
      <div className="brand">
        <OrbianLogo size={36} />
        <div>
          <strong>orbian</strong>
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

      <div className="sidebar-spacer" />

      <div className="sidebar-bottom">
        <Link to="/profile" className="sidebar-user-row">
          <span className="sidebar-avatar">{initials(user?.name)}</span>
          <div className="sidebar-user-info">
            <strong>{user?.name?.split(' ')[0]}</strong>
            <span>Ver perfil</span>
          </div>
          <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
        </Link>
      </div>
    </aside>
  )
}
