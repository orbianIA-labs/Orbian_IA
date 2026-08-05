import { LogOut, Moon, Plus, Sun, User as UserIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { useEffect, useState } from 'react'
import { GlobalSearch } from './GlobalSearch'
import { NotificationsBell } from './NotificationsBell'

function resolvedIsDark(theme: string) {
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function TopBar() {
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const navigate = useNavigate()
  const [userOpen, setUserOpen] = useState(false)
  const theme = useThemeStore((state) => state.theme)
  const setTheme = useThemeStore((state) => state.setTheme)
  const [isDark, setIsDark] = useState(() => resolvedIsDark(theme))

  useEffect(() => setIsDark(resolvedIsDark(theme)), [theme])

  return (
    <header className="topbar">
      <GlobalSearch />

      <div className="topbar-actions">
        <button
          className="theme-toggle"
          role="switch"
          aria-checked={isDark}
          aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
        >
          <Sun size={13} className="theme-toggle-icon theme-toggle-icon-sun" />
          <Moon size={13} className="theme-toggle-icon theme-toggle-icon-moon" />
          <span className="theme-toggle-knob" />
        </button>

        <NotificationsBell />

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
