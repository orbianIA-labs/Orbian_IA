import { Bell, ChevronDown, LogOut, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useState } from 'react'

function initials(name?: string) {
  if (!name) return 'O'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
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
        <input placeholder="Buscar casos, execuções, clientes, documentos..." />
      </label>

      <div className="topbar-actions">
        <button className="bell-btn" aria-label="Notificações">
          <Bell size={18} />
          <span className="bell-dot" />
        </button>

        <div className="topbar-user" onClick={() => setUserOpen(!userOpen)} style={{ position: 'relative' }}>
          <span className="avatar" aria-hidden="true">{initials(user?.name)}</span>
          <span className="topbar-name">{user?.name?.split(' ')[0]}</span>
          <ChevronDown size={15} style={{ color: 'var(--muted)' }} />

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
