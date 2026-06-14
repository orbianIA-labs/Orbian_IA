import { Scale } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/authStore'

export function LoginPage() {
  const navigate = useNavigate()
  const setTokens = useAuthStore((state) => state.setTokens)

  async function handleDemoLogin() {
    const session = await authService.login()
    setTokens(session.accessToken, session.user)
    navigate('/')
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-brand">
          <Scale size={30} />
          <span>Lexio.IA</span>
        </div>
        <h1>Do caso a peca pronta.</h1>
        <p>
          Plataforma operacional para advogados que precisam organizar casos, prazos,
          documentos e comunicacao com clientes em um unico fluxo.
        </p>
        <Button onClick={handleDemoLogin}>Entrar na beta</Button>
      </section>
      <aside className="auth-side">
        <strong>Hoje</strong>
        <span>3 prazos criticos</span>
        <span>2 pecas em rascunho</span>
        <span>1 cliente aguardando retorno</span>
      </aside>
    </main>
  )
}
