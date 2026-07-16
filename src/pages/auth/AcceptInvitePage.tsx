import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { escritorioService } from '@/services/escritorio.service'
import { useAuthStore } from '@/store/authStore'

export function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const accessToken = useAuthStore((s) => s.accessToken)
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    if (!accessToken || !token) return
    escritorioService.aceitarConvite(token)
      .then(() => setStatus('ok'))
      .catch(() => setStatus('error'))
  }, [accessToken, token])

  if (!accessToken) {
    return <Navigate to={`/login?convite=${token}`} replace />
  }

  return (
    <main className="auth-page-split" style={{ gridTemplateColumns: '1fr' }}>
      <section className="auth-form-side" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="auth-card" style={{ textAlign: 'center', alignItems: 'center' }}>
          {status === 'loading' && <p>Aceitando convite...</p>}
          {status === 'ok' && (
            <>
              <CheckCircle2 size={40} style={{ color: 'var(--success)' }} />
              <h2>Convite aceito!</h2>
              <p>Você agora faz parte do escritório.</p>
              <Button onClick={() => navigate('/')}>Ir para o Dashboard</Button>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle size={40} style={{ color: 'var(--danger)' }} />
              <h2>Convite inválido</h2>
              <p>Este convite pode ter expirado, já ter sido usado, ou ter sido enviado para outro e-mail.</p>
              <Button onClick={() => navigate('/')}>Ir para o Dashboard</Button>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
