import { Bell, LogOut, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useState } from 'react'
import type { User } from '@/types/domain.types'

function initials(name?: string) {
  if (!name) return 'O'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

const PLAN_LABEL: Record<User['plan'], string> = {
  free: 'Plano Gratuito',
  solo: 'Advogado · Solo',
  pro: 'Sênior Associate',
}

export function TopBar() {
  const user = useAuthStore((state) => state.user)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const navigate = useNavigate()
  const [userOpen, setUserOpen] = useState(false)

  return (
    <header className="topbar">
      <label className="search-box">
        <Search size={16} />
        <input placeholder="Buscar execuções ou casos..." />
      </label>

      <div className="topbar-actions">
        <button className="bell-btn" aria-label="Notificações">
          <Bell size={18} />
          <span className="bell-dot" />
        </button>

        <div
          className="topbar-user"
          onClick={() => setUserOpen(!userOpen)}
          style={{ position: 'relative' }}
        >
          <div className="topbar-user-text">
            <strong>{user?.name ?? 'Usuário'}</strong>
            <span>{user ? PLAN_LABEL[user.plan] : ''}</span>
          </div>
          <span className="avatar" aria-hidden="true">{initials(user?.name)}</span>

          {userOpen && (
            <div className="user-dropdown">
              <button
                onClick={() => { clearAuth(); navigate('/login') }}
                className="user-dropdown-item danger"
              >
                <LogOut size={15} />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
