import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { OrbianLogo } from '@/components/brand/OrbianLogo'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/authStore'

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
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-brand">
          <OrbianLogo size={34} withWordmark />
        </div>
        <h1>O sistema operacional da advocacia.</h1>
        <p>
          Gerencie casos, monitore processos, crie peças com IA e controle prazos — tudo em um único
          fluxo de execução.
        </p>
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
              placeholder="seu@email.com"
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
          </Button>
        </form>
        <p style={{ marginTop: 16, fontSize: 13, textAlign: 'center', color: 'var(--muted)' }}>
          {mode === 'login' ? 'Ainda não tem conta?' : 'Já tem conta?'}{' '}
          <button
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            {mode === 'login' ? 'Cadastre-se' : 'Faça login'}
          </button>
        </p>
      </section>
      <aside className="auth-side">
        <strong>Hoje</strong>
        <span>Gerencie seus casos</span>
        <span>Controle seus prazos</span>
        <span>Gere peças com IA</span>
      </aside>
    </main>
  )
}
