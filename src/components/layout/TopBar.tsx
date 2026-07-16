import { Bell, LogOut, Monitor, Moon, Plus, Search, Sun, User as UserIcon, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore, type ThemeMode } from '@/store/themeStore'
import { useState } from 'react'

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
]

export function TopBar() {
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const navigate = useNavigate()
  const [userOpen, setUserOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const theme = useThemeStore((state) => state.theme)
  const setTheme = useThemeStore((state) => state.setTheme)
  const ThemeIcon = THEME_OPTIONS.find((t) => t.value === theme)?.icon ?? Monitor

  return (
    <header className="topbar">
      <label className="search-box">
        <Search size={16} />
        <input placeholder="Pesquisar em toda a operação..." />
        <span className="search-kbd">⌘K</span>
      </label>

      <div className="topbar-actions">
        <div className="topbar-icon-user" style={{ position: 'relative' }}>
          <button
            className="bell-btn"
            aria-label="Alternar tema"
            onClick={() => setThemeOpen(!themeOpen)}
          >
            <ThemeIcon size={18} />
          </button>

          {themeOpen && (
            <div className="user-dropdown theme-dropdown">
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  className={`user-dropdown-item ${theme === value ? 'active' : ''}`}
                  onClick={() => { setTheme(value); setThemeOpen(false) }}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

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

        <button className="topbar-new-btn" onClick={() => navigate('/cases/new')}>
          <Plus size={16} />
          Novo caso
        </button>
      </div>
    </header>
  )
}
