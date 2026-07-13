import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { OrbianLogo } from '@/components/brand/OrbianLogo'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/authStore'

const PIPELINE_LABELS = ['Cadastro', 'Documentos', 'Peças', 'Prazos', 'Revisão', 'Encerramento']
// Coordenadas de um zig-zag simples para o gráfico decorativo (mesmas etapas do pipeline real).
const PIPELINE_POINTS = [
  { x: 20, y: 70 }, { x: 90, y: 20 }, { x: 160, y: 70 },
  { x: 230, y: 20 }, { x: 300, y: 70 }, { x: 370, y: 15 },
]

export function LoginPage() {
  const navigate = useNavigate()
  const setTokens = useAuthStore((state) => state.setTokens)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const session =
        mode === 'login'
          ? await authService.login(email, senha)
          : await authService.register(nome, email, senha)
      setTokens(session.accessToken, session.user)
      navigate('/')
    } catch {
      setError(mode === 'login' ? 'Email ou senha inválidos' : 'Erro ao criar conta. Email já cadastrado?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page-split">
      <section className="auth-brand-side">
        <div className="auth-brand">
          <OrbianLogo size={32} withWordmark />
        </div>

        <div className="auth-hero">
          <h1>O Sistema Operacional da <span>Advocacia</span></h1>
          <p>Transforme informações jurídicas em execução inteligente através de fluxos automatizados de alto desempenho.</p>
        </div>

        <svg className="auth-pipeline-chart" viewBox="0 0 390 90" fill="none">
          <polyline
            points={PIPELINE_POINTS.map((p) => `${p.x},${p.y}`).join(' ')}
            stroke="var(--c-primary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {PIPELINE_POINTS.map((p, i) => (
            <g key={PIPELINE_LABELS[i]}>
              <circle cx={p.x} cy={p.y} r="4" fill={i === PIPELINE_POINTS.length - 1 ? 'var(--c-primary)' : 'var(--surface)'} stroke="var(--c-primary)" strokeWidth="2" />
              <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="9" fill={i === PIPELINE_POINTS.length - 1 ? 'var(--c-primary)' : 'var(--muted)'} fontWeight={i === PIPELINE_POINTS.length - 1 ? 700 : 400}>
                {PIPELINE_LABELS[i]}
              </text>
            </g>
          ))}
        </svg>

        <div className="auth-badges">
          <span><ShieldCheck size={14} /> Ambiente seguro</span>
          <span><Sparkles size={14} /> IA integrada</span>
        </div>
      </section>

      <section className="auth-form-side">
        <div className="auth-card">
          <header>
            <h2>{mode === 'login' ? 'Entrar na Orbian.AI' : 'Criar conta na Orbian.AI'}</h2>
            <p>{mode === 'login' ? 'Acesse sua operação jurídica inteligente.' : 'Comece a organizar sua operação jurídica.'}</p>
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
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@escritorio.com.br"
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
            {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? (mode === 'login' ? 'Entrando...' : 'Criando conta...') : (mode === 'login' ? 'Entrar' : 'Criar conta')}
              {!loading && <ArrowRight size={16} />}
            </Button>
          </form>
          <p className="auth-toggle">
            {mode === 'login' ? 'Ainda não possui conta?' : 'Já possui conta?'}{' '}
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
            >
              {mode === 'login' ? 'Criar conta' : 'Fazer login'}
            </button>
          </p>
        </div>
      </section>
    </main>
  )
}
