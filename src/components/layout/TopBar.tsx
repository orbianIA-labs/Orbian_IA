import { LogOut, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'

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
