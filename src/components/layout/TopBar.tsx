import { Bell, LogOut, Search, User as UserIcon, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useState } from 'react'

export function TopBar() {
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const navigate = useNavigate()
  const [userOpen, setUserOpen] = useState(false)

  return (
    <header className="topbar">
      <label className="search-box">
        <Search size={16} />
        <input placeholder="Pesquisar em toda a operação..." />
        <span className="search-kbd">⌘K</span>
      </label>

      <div className="topbar-actions">
        <button className="bell-btn" aria-label="Notificações">
          <Bell size={18} />
          <span className="bell-dot" />
        </button>

        <button className="bell-btn" aria-label="Ações rápidas de IA">
          <Zap size={18} />
        </button>

        <div
          className="topbar-icon-user"
          onClick={() => setUserOpen(!userOpen)}
          style={{ position: 'relative' }}
        >
          <span className="bell-btn" aria-label="Conta">
            <UserIcon size={18} />
          </span>

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
