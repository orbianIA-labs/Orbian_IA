import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { OrbianLogo } from '@/components/brand/OrbianLogo'
import { authService } from '@/services/auth.service'
import { escritorioService } from '@/services/escritorio.service'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/toastStore'

type PipelinePoint = {
  key: string
  label: string
  desc: string
  x: number
  y: number
  labelPos: 'above' | 'below'
}

const PIPELINE: PipelinePoint[] = [
  { key: 'cliente', label: 'Cliente', desc: 'Gestão 360 do assistido', x: 25, y: 95, labelPos: 'below' },
  { key: 'caso', label: 'Caso', desc: 'Estruture o caso em minutos', x: 145, y: 35, labelPos: 'above' },
  { key: 'documentos', label: 'Documentos', desc: 'Organize provas e anexos', x: 265, y: 118, labelPos: 'below' },
  { key: 'pecas', label: 'Gerar Peças', desc: 'Peças com IA em segundos', x: 385, y: 92, labelPos: 'below' },
  { key: 'prazos', label: 'Prazos', desc: 'Nunca perca uma data', x: 480, y: 28, labelPos: 'above' },
  { key: 'conclusao', label: 'Conclusão', desc: 'Feche com auditoria completa', x: 585, y: 82, labelPos: 'below' },
]

/** Curva suave (Catmull-Rom → Bézier) passando exatamente pelos pontos do pipeline. */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return ''
  const d = [`M ${points[0].x},${points[0].y}`]
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d.push(`C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`)
  }
  return d.join(' ')
}

const PIPELINE_PATH = smoothPath(PIPELINE)
const PIPELINE_ANIM_DURATION = 18 // segundos — mesmo valor do <animateMotion>

/** Quando (em segundos, dentro do loop) a bolinha animada passa por cada ponto,
 * proporcional à distância acumulada ao longo da curva até ali. */
function computePulseDelays(points: { x: number; y: number }[], duration: number): number[] {
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(b.x - a.x, b.y - a.y)
  const cumulative = [0]
  for (let i = 1; i < points.length; i++) cumulative.push(cumulative[i - 1] + dist(points[i - 1], points[i]))
  const total = cumulative[cumulative.length - 1]
  return cumulative.map((c) => (c / total) * duration)
}

const PIPELINE_PULSE_DELAYS = computePulseDelays(PIPELINE, PIPELINE_ANIM_DURATION)

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const conviteToken = searchParams.get('convite') ?? undefined
  const setTokens = useAuthStore((state) => state.setTokens)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [lembrar, setLembrar] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [tempToken, setTempToken] = useState<string | null>(null)
  const [codigo2fa, setCodigo2fa] = useState('')

  async function aceitarConviteSeHouver() {
    if (!conviteToken) return
    try { await escritorioService.aceitarConvite(conviteToken) } catch { /* convite pode já ter sido usado/expirado */ }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const result = await authService.login(email, senha, lembrar)
        if (result.status === 'requires2fa') {
          setTempToken(result.tempToken)
          return
        }
        setTokens(result.accessToken, result.user)
        await aceitarConviteSeHouver()
        navigate('/')
        return
      }

      const session = await authService.register(nome, email, senha, lembrar, conviteToken)
      setTokens(session.accessToken, session.user)
      navigate('/')
    } catch {
      setError(mode === 'login' ? 'Email ou senha inválidos' : 'Erro ao criar conta. Email já cadastrado?')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify2fa(e: React.FormEvent) {
    e.preventDefault()
    if (!tempToken) return
    setError('')
    setLoading(true)
    try {
      const session = await authService.verifyTwoFactor(tempToken, codigo2fa, lembrar)
      setTokens(session.accessToken, session.user)
      await aceitarConviteSeHouver()
      navigate('/')
    } catch {
      setError('Código inválido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page-split">
      <section className="auth-form-side">
        <div className="auth-mini-brand">
          <OrbianLogo size={22} />
          <span>Orbian<b>.AI</b></span>
        </div>

        <div className="auth-card">
          {tempToken ? (
            <>
              <header>
                <h2>Verificação em duas etapas.</h2>
                <p>Digite o código de 6 dígitos do seu aplicativo autenticador.</p>
              </header>
              <form onSubmit={handleVerify2fa} className="form-stack">
                <label>
                  Código
                  <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    value={codigo2fa}
                    onChange={(e) => setCodigo2fa(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    required
                  />
                </label>
                {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}
                <Button type="submit" disabled={loading}>
                  {loading ? 'Verificando...' : 'Verificar'}
                  {!loading && <ArrowRight size={16} />}
                </Button>
                <button type="button" className="auth-forgot-link" onClick={() => { setTempToken(null); setCodigo2fa('') }}>
                  Voltar para o login
                </button>
              </form>
            </>
          ) : (
          <>
          <header>
            <h2>{mode === 'login' ? 'Bem-vindo.' : 'Criar conta.'}</h2>
            <p>{mode === 'login' ? 'Entre para continuar sua operação jurídica.' : 'Comece a organizar sua operação jurídica.'}</p>
          </header>

          <form onSubmit={handleSubmit} className="form-stack">
            {mode === 'register' && (
              <label>
                Nome completo
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                  required
                />
              </label>
            )}
            <label>
              E-mail
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@empresa.com.br"
                required
              />
            </label>
            <label>
              Senha
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                required
              />
            </label>

            <div className="auth-form-row">
              <label className="auth-remember">
                <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} />
                Lembrar-me
              </label>
              <button
                type="button"
                className="auth-forgot-link"
                onClick={() => toast('Recuperação de senha ainda não está disponível.', 'info')}
              >
                Esqueci minha senha
              </button>
            </div>

            {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? (mode === 'login' ? 'Entrando...' : 'Criando conta...') : (mode === 'login' ? 'Entrar' : 'Criar conta')}
              {!loading && <ArrowRight size={16} />}
            </Button>
          </form>

          <div className="auth-divider"><span>ou</span></div>

          <button
            type="button"
            className="auth-google-btn"
            onClick={() => toast('Login com Google ainda não está disponível.', 'info')}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
            </svg>
            Continuar com Google
          </button>

          <p className="auth-toggle">
            {mode === 'login' ? 'Ainda não possui conta?' : 'Já possui conta?'}{' '}
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
            >
              {mode === 'login' ? 'Criar conta' : 'Fazer login'}
            </button>
          </p>
          </>
          )}
        </div>

        <footer className="auth-legal-links">
          <a href="#">Termos de Uso</a>
          <a href="#">Política de Privacidade</a>
        </footer>
      </section>

      <section className="auth-brand-side">
        <div className="auth-brand">
          <OrbianLogo size={30} withWordmark />
        </div>
        <p className="auth-tagline">O sistema operacional da advocacia.</p>

        <div className="auth-pipeline-wrap">
          <svg className="auth-pipeline-chart" viewBox="0 0 610 150" fill="none">
            <path className="pipeline-path" d={PIPELINE_PATH} stroke="var(--line-strong)" strokeWidth="2" strokeLinecap="round" />

            <circle className="pipeline-dot-traveler" r="5">
              <animateMotion dur={`${PIPELINE_ANIM_DURATION}s`} repeatCount="indefinite" path={PIPELINE_PATH} />
            </circle>

            {PIPELINE.map((p, i) => {
              const tooltipWidth = 155
              const tooltipX = Math.min(Math.max(p.x - tooltipWidth / 2, 4), 610 - tooltipWidth - 4)
              return (
                <g key={p.key} className="pipeline-point" tabIndex={0}>
                  <circle cx={p.x} cy={p.y} r="16" fill="transparent" />
                  <circle
                    className="pipeline-point-dot pipeline-point-dot-pulse"
                    cx={p.x}
                    cy={p.y}
                    r="4.5"
                    style={{ animationDelay: `${PIPELINE_PULSE_DELAYS[i]}s`, animationDuration: `${PIPELINE_ANIM_DURATION}s` }}
                  />
                  <text
                    x={p.x}
                    y={p.labelPos === 'above' ? p.y - 14 : p.y + 22}
                    textAnchor="middle"
                    className="pipeline-label"
                  >
                    {p.label}
                  </text>
                  <foreignObject
                    x={tooltipX}
                    y={p.labelPos === 'above' ? p.y + 14 : p.y + 32}
                    width={tooltipWidth}
                    height="30"
                  >
                    <div className="pipeline-tooltip">{p.desc}</div>
                  </foreignObject>
                </g>
              )
            })}
          </svg>
        </div>
      </section>
    </main>
  )
}
