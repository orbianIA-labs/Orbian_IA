import {
  BookOpen,
  FolderKanban,
  Home,
  Settings,
  Zap,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types/domain.types'

const navItems = [
  { to: '/', label: 'Início', icon: Home },
  { to: '/cases', label: 'Casos', icon: FolderKanban },
  { to: '/biblioteca', label: 'Modelo de Peças', icon: BookOpen },
  { to: '/profile', label: 'Configurações', icon: Settings },
]

const PLAN_LABEL: Record<User['plan'], string> = {
  free: 'Plano Gratuito',
  solo: 'Advogado · Solo',
  pro: 'Senior Counsel',
}

function initials(name?: string) {
  if (!name) return 'O'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

export function Sidebar() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  return (
    <aside className="sidebar" aria-label="Navegação principal">
      <div className="brand">
        <span className="brand-mark">
          <Zap size={18} fill="currentColor" />
        </span>
        <div>
          <strong>Orbian</strong>
          <small>COMMAND CENTER</small>
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

      <button className="sidebar-user-row" onClick={() => navigate('/profile')}>
        <span className="sidebar-avatar">{initials(user?.name)}</span>
        <span className="sidebar-user-info">
          <strong>{user?.name ?? 'Usuário'}</strong>
          <span>{user ? PLAN_LABEL[user.plan] : ''}</span>
        </span>
      </button>
    </aside>
  )
}
