import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Shield, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/authStore'

type Tab = 'perfil' | 'seguranca'

export function ProfilePage() {
  const user = useAuthStore((state) => state.user)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('perfil')

  async function sair() {
    await authService.logout()
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="settings-page">
      <header className="new-case-header">
        <div>
          <h1>Configurações</h1>
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>Gerencie sua conta na Orbian.AI.</p>
        </div>
      </header>

      <div className="settings-body">
        <nav className="settings-tabs">
          <button className={tab === 'perfil' ? 'active' : ''} onClick={() => setTab('perfil')}>
            <User size={16} /> Perfil
          </button>
          <button className={tab === 'seguranca' ? 'active' : ''} onClick={() => setTab('seguranca')}>
            <Shield size={16} /> Segurança
          </button>
        </nav>

        <div className="settings-content">
          {tab === 'perfil' && (
            <section className="new-case-card">
              <p className="section-label-lg" style={{ fontSize: 17 }}>Perfil</p>
              <p className="new-case-card-sub">Suas informações de conta na Orbian.AI.</p>
              <dl className="definition-list" style={{ gap: 16 }}>
                <div><dt>Nome</dt><dd>{user?.name}</dd></div>
                <div><dt>Email</dt><dd>{user?.email}</dd></div>
                <div><dt>Plano</dt><dd style={{ textTransform: 'capitalize' }}>{user?.plan}</dd></div>
              </dl>
            </section>
          )}

          {tab === 'seguranca' && (
            <section className="new-case-card">
              <p className="section-label-lg" style={{ fontSize: 17 }}>Segurança</p>
              <p className="new-case-card-sub">Controle o acesso à sua conta.</p>
              <div className="settings-danger-row">
                <div>
                  <strong>Encerrar sessão</strong>
                  <p>Você será desconectado da Orbian.AI neste dispositivo.</p>
                </div>
                <Button variant="secondary" onClick={sair}>
                  <LogOut size={15} /> Sair
                </Button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
