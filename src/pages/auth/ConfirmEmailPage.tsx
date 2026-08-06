import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/authStore'

/** Tela do link de confirmação de e-mail (POST /api/auth/confirmar-email). Já loga
 *  o usuário automaticamente em caso de sucesso — não faz sentido pedir senha de novo. */
export function ConfirmEmailPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const setTokens = useAuthStore((s) => s.setTokens)
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    if (!token) { setStatus('error'); return }
    authService.confirmEmail(token)
      .then((session) => { setTokens(session.accessToken, session.user); setStatus('ok') })
      .catch(() => setStatus('error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <main className="auth-page-split" style={{ gridTemplateColumns: '1fr' }}>
      <section className="auth-form-side" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="auth-card" style={{ textAlign: 'center', alignItems: 'center' }}>
          {status === 'loading' && <p>Confirmando seu e-mail...</p>}
          {status === 'ok' && (
            <>
              <CheckCircle2 size={40} style={{ color: 'var(--success)' }} />
              <h2>E-mail confirmado!</h2>
              <p>Sua conta está ativa.</p>
              <Button onClick={() => navigate('/')}>Ir para o Dashboard</Button>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle size={40} style={{ color: 'var(--danger)' }} />
              <h2>Link inválido</h2>
              <p>Esse link pode ter expirado, já ter sido usado, ou o e-mail já estar confirmado. Tente fazer login normalmente.</p>
              <Button onClick={() => navigate('/login')}>Ir para o login</Button>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
