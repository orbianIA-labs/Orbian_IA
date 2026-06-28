import { LogOut, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'

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

  return (
    <header className="topbar">
      <label className="search-box">
        <Search size={17} />
        <input placeholder="Buscar caso, cliente ou peca" />
      </label>

      <div className="topbar-user">
        <span className="avatar" aria-hidden="true">
          {initials(user?.name)}
        </span>
        <span>{user?.name}</span>
        <Button
          aria-label="Sair"
          title="Sair"
          variant="ghost"
          onClick={() => {
            clearAuth()
            navigate('/login')
          }}
        >
          <LogOut size={18} />
        </Button>
      </div>
    </header>
  )
}
