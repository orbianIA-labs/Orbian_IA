import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Bot, Building2, ChevronRight, CreditCard, KeyRound, LogOut,
  Monitor, Moon, Plus, Shield, ShieldCheck, Sun, Trash2, User, Users,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { authService } from '@/services/auth.service'
import { usuariosService, type IaPreferencias } from '@/services/usuarios.service'
import { escritorioService } from '@/services/escritorio.service'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore, type ThemeMode } from '@/store/themeStore'
import { toast } from '@/store/toastStore'
import { formatDate } from '@/lib/utils'

type SectionKey = 'conta' | 'escritorio' | 'usuarios' | 'ia' | 'assinatura' | 'seguranca'

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
]

const SECTIONS: { key: SectionKey; label: string; desc: string; icon: typeof User }[] = [
  { key: 'conta', label: 'Conta', desc: 'Dados pessoais, e-mail e senha', icon: User },
  { key: 'escritorio', label: 'Escritório', desc: 'Informações da banca e identidade visual', icon: Building2 },
  { key: 'usuarios', label: 'Usuários', desc: 'Equipe, permissões e convites', icon: Users },
  { key: 'ia', label: 'Inteligência Artificial', desc: 'Tom de escrita e automações', icon: Bot },
  { key: 'assinatura', label: 'Assinatura', desc: 'Plano atual e limites', icon: CreditCard },
  { key: 'seguranca', label: 'Segurança', desc: 'Autenticação em duas etapas e sessões', icon: Shield },
]

export function ProfilePage() {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const theme = useThemeStore((state) => state.theme)
  const setTheme = useThemeStore((state) => state.setTheme)
  const [section, setSection] = useState<SectionKey | null>(null)

  async function sair() {
    await authService.logout()
    clearAuth()
    navigate('/login')
  }

  const activeSection = SECTIONS.find((s) => s.key === section)

  return (
    <div className="settings-page">
      <header className="new-case-header">
        <div>
          <h1>Configurações</h1>
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>Gerencie sua conta e o escritório.</p>
        </div>
      </header>

      <div className="settings-scroll">
        {section === null ? (
          <>
            <section className="new-case-card">
              <p className="section-label-lg" style={{ fontSize: 17 }}>Aparência</p>
              <p className="new-case-card-sub">Escolha o tema da interface.</p>
              <div className="theme-option-row">
                {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    className={`theme-option-btn ${theme === value ? 'active' : ''}`}
                    onClick={() => setTheme(value)}
                  >
                    <Icon size={18} />
                    {label}
                  </button>
                ))}
              </div>
            </section>

            <div className="settings-tile-grid">
              {SECTIONS.map(({ key, label, desc, icon: Icon }) => (
                <button key={key} className="settings-tile" onClick={() => setSection(key)}>
                  <span className="settings-tile-icon"><Icon size={18} /></span>
                  <span className="settings-tile-text">
                    <strong>{label}</strong>
                    <span>{desc}</span>
                  </span>
                  <ChevronRight size={16} className="settings-tile-chevron" />
                </button>
              ))}
            </div>
          </>
        ) : (
          <section className="new-case-card">
            <button className="settings-back-btn" onClick={() => setSection(null)}>
              <ArrowLeft size={15} /> Voltar
            </button>
            <p className="section-label-lg" style={{ fontSize: 17, marginTop: 12 }}>{activeSection?.label}</p>
            <p className="new-case-card-sub">{activeSection?.desc}</p>

            {section === 'conta' && <ContaSection />}
            {section === 'escritorio' && <EscritorioSection />}
            {section === 'usuarios' && <UsuariosSection />}
            {section === 'ia' && <IaSection />}
            {section === 'assinatura' && <AssinaturaSection />}
            {section === 'seguranca' && <SegurancaSection onSair={sair} />}
          </section>
        )}
      </div>
    </div>
  )
}

function ContaSection() {
  const qc = useQueryClient()
  const { data: perfil } = useQuery({ queryKey: ['perfil'], queryFn: () => usuariosService.obterPerfil() })
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [editado, setEditado] = useState(false)

  if (perfil && !editado) {
    setNome(perfil.nome)
    setEmail(perfil.email)
    setEditado(true)
  }

  const salvarPerfil = useMutation({
    mutationFn: () => usuariosService.atualizarPerfil(nome, email),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['perfil'] }); toast('Perfil atualizado.', 'success') },
    onError: () => toast('Não foi possível salvar. Verifique se o e-mail já está em uso.', 'error'),
  })

  const alterarSenha = useMutation({
    mutationFn: () => usuariosService.alterarSenha(senhaAtual, novaSenha),
    onSuccess: () => { setSenhaAtual(''); setNovaSenha(''); toast('Senha alterada.', 'success') },
    onError: () => toast('Senha atual incorreta ou nova senha inválida (mín. 8 caracteres).', 'error'),
  })

  return (
    <div className="settings-section-body">
      <div className="nc-field-pair">
        <label className="nc-field">Nome<input value={nome} onChange={(e) => setNome(e.target.value)} /></label>
        <label className="nc-field">E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      </div>
      <Button onClick={() => salvarPerfil.mutate()} disabled={salvarPerfil.isPending}>
        {salvarPerfil.isPending ? 'Salvando...' : 'Salvar alterações'}
      </Button>

      <div className="settings-divider" />

      <p className="section-label-lg" style={{ fontSize: 14 }}>Alterar senha</p>
      <div className="nc-field-pair">
        <label className="nc-field">Senha atual<input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} /></label>
        <label className="nc-field">Nova senha<input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} /></label>
      </div>
      <Button
        variant="secondary"
        onClick={() => alterarSenha.mutate()}
        disabled={!senhaAtual || novaSenha.length < 8 || alterarSenha.isPending}
      >
        {alterarSenha.isPending ? 'Alterando...' : 'Alterar senha'}
      </Button>
    </div>
  )
}

function EscritorioSection() {
  const qc = useQueryClient()
  const { data: escritorio, isLoading } = useQuery({ queryKey: ['escritorio'], queryFn: () => escritorioService.obter() })
  const [form, setForm] = useState({ nome: '', endereco: '', telefone: '', cnpj: '', logoUrl: '' })
  const [carregado, setCarregado] = useState(false)

  if (!isLoading && escritorio && !carregado) {
    setForm({
      nome: escritorio.nome,
      endereco: escritorio.endereco ?? '',
      telefone: escritorio.telefone ?? '',
      cnpj: escritorio.cnpj ?? '',
      logoUrl: escritorio.logoUrl ?? '',
    })
    setCarregado(true)
  }

  const salvar = useMutation({
    mutationFn: () => escritorioService.salvar({
      nome: form.nome,
      endereco: form.endereco || null,
      telefone: form.telefone || null,
      cnpj: form.cnpj || null,
      logoUrl: form.logoUrl || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['escritorio'] }); toast('Escritório salvo.', 'success') },
    onError: () => toast('Não foi possível salvar o escritório.', 'error'),
  })

  return (
    <div className="settings-section-body">
      <label className="nc-field">Nome do escritório<input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Alves & Associados" /></label>
      <div className="nc-field-pair">
        <label className="nc-field">Telefone<input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></label>
        <label className="nc-field">CNPJ<input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} /></label>
      </div>
      <label className="nc-field">Endereço<input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></label>
      <label className="nc-field">URL do logo<input value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} placeholder="https://..." /></label>
      <Button onClick={() => salvar.mutate()} disabled={!form.nome || salvar.isPending}>
        {salvar.isPending ? 'Salvando...' : 'Salvar escritório'}
      </Button>
    </div>
  )
}

function UsuariosSection() {
  const qc = useQueryClient()
  const { data: perfil } = useQuery({ queryKey: ['perfil'], queryFn: () => usuariosService.obterPerfil() })
  const { data: escritorio } = useQuery({ queryKey: ['escritorio'], queryFn: () => escritorioService.obter() })
  const { data: membros = [] } = useQuery({
    queryKey: ['escritorio-membros'],
    queryFn: () => escritorioService.listarMembros(),
    enabled: !!escritorio,
  })
  const { data: convites = [] } = useQuery({
    queryKey: ['escritorio-convites'],
    queryFn: () => escritorioService.listarConvites(),
    enabled: !!escritorio && perfil?.papelEscritorio === 'owner',
  })
  const [email, setEmail] = useState('')
  const souOwner = perfil?.papelEscritorio === 'owner'

  const convidar = useMutation({
    mutationFn: () => escritorioService.convidar(email),
    onSuccess: () => { setEmail(''); qc.invalidateQueries({ queryKey: ['escritorio-convites'] }); toast('Convite enviado.', 'success') },
    onError: () => toast('Não foi possível enviar o convite.', 'error'),
  })

  const revogarConvite = useMutation({
    mutationFn: (id: string) => escritorioService.revogarConvite(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['escritorio-convites'] }),
  })

  const removerMembro = useMutation({
    mutationFn: (id: string) => escritorioService.removerMembro(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['escritorio-membros'] }),
    onError: () => toast('Não foi possível remover este membro.', 'error'),
  })

  if (!escritorio) {
    return (
      <div className="settings-section-body">
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>
          Cadastre os dados do seu escritório na aba "Escritório" antes de convidar membros da equipe.
        </p>
      </div>
    )
  }

  return (
    <div className="settings-section-body">
      <div className="settings-member-list">
        {membros.map((m) => (
          <div className="settings-member-row" key={m.id}>
            <div>
              <strong>{m.nome}</strong>
              <p>{m.email} · {m.papel === 'owner' ? 'Responsável' : 'Membro'}</p>
            </div>
            {souOwner && m.papel !== 'owner' && (
              <button className="icon-btn danger" title="Remover" onClick={() => removerMembro.mutate(m.id)}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {souOwner && (
        <>
          <div className="settings-divider" />
          <p className="section-label-lg" style={{ fontSize: 14 }}>Convidar membro</p>
          <div className="nc-field-pair" style={{ alignItems: 'flex-end' }}>
            <label className="nc-field">E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colega@escritorio.com" /></label>
            <Button onClick={() => convidar.mutate()} disabled={!email || convidar.isPending}>
              <Plus size={15} /> Convidar
            </Button>
          </div>

          {convites.filter((c) => !c.aceitoEm).length > 0 && (
            <div className="settings-member-list">
              {convites.filter((c) => !c.aceitoEm).map((c) => (
                <div className="settings-member-row" key={c.id}>
                  <div>
                    <strong>{c.email}</strong>
                    <p>Convite pendente · expira em {formatDate(c.expiresAt)}</p>
                  </div>
                  <button className="icon-btn danger" title="Revogar" onClick={() => revogarConvite.mutate(c.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

const TOM_OPTIONS: { value: IaPreferencias['tom']; label: string }[] = [
  { value: 'formal', label: 'Formal' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'direto', label: 'Direto' },
]

function IaSection() {
  const qc = useQueryClient()
  const { data: prefs } = useQuery({ queryKey: ['ia-preferencias'], queryFn: () => usuariosService.obterIaPreferencias() })
  const [form, setForm] = useState<IaPreferencias | null>(null)
  const atual = form ?? prefs

  const salvar = useMutation({
    mutationFn: (p: IaPreferencias) => usuariosService.atualizarIaPreferencias(p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ia-preferencias'] }); toast('Preferências de IA salvas.', 'success') },
  })

  if (!atual) return null

  function update(patch: Partial<IaPreferencias>) {
    const next = { ...atual!, ...patch }
    setForm(next)
    salvar.mutate(next)
  }

  return (
    <div className="settings-section-body">
      <label className="nc-field">
        Tom de escrita
        <select value={atual.tom} onChange={(e) => update({ tom: e.target.value as IaPreferencias['tom'] })}>
          {TOM_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </label>

      <div className="settings-toggle-list">
        <label className="settings-toggle-row">
          <input type="checkbox" checked={atual.fortalecerFundamentacao} onChange={(e) => update({ fortalecerFundamentacao: e.target.checked })} />
          Fortalecer fundamentação por padrão
        </label>
        <label className="settings-toggle-row">
          <input type="checkbox" checked={atual.sugerirJurisprudencia} onChange={(e) => update({ sugerirJurisprudencia: e.target.checked })} />
          Sugerir jurisprudência por padrão
        </label>
        <label className="settings-toggle-row">
          <input type="checkbox" checked={atual.verificarClareza} onChange={(e) => update({ verificarClareza: e.target.checked })} />
          Verificar clareza por padrão
        </label>
        <label className="settings-toggle-row">
          <input type="checkbox" checked={atual.contraArgumentacao} onChange={(e) => update({ contraArgumentacao: e.target.checked })} />
          Antecipar contra-argumentação por padrão
        </label>
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)' }}>Esses padrões são aplicados automaticamente ao abrir o Copiloto em Gerar Peças.</p>
    </div>
  )
}

function AssinaturaSection() {
  const { data: assinatura } = useQuery({ queryKey: ['assinatura'], queryFn: () => usuariosService.obterAssinatura() })
  if (!assinatura) return null

  const ilimitado = (n: number) => n >= 999999

  return (
    <div className="settings-section-body">
      <div className="settings-plan-badge">Plano {assinatura.plano}</div>
      <dl className="definition-list" style={{ gap: 16, marginTop: 12 }}>
        <div><dt>Casos ativos</dt><dd>{ilimitado(assinatura.limites.casosAtivosMax) ? 'Ilimitado' : `até ${assinatura.limites.casosAtivosMax}`}</dd></div>
        <div><dt>Usuários no escritório</dt><dd>{ilimitado(assinatura.limites.usuariosMax) ? 'Ilimitado' : `até ${assinatura.limites.usuariosMax}`}</dd></div>
        <div><dt>Gerações de IA por mês</dt><dd>{ilimitado(assinatura.limites.geracoesIaPorMes) ? 'Ilimitado' : `até ${assinatura.limites.geracoesIaPorMes}`}</dd></div>
        <div><dt>Cobrança</dt><dd>{assinatura.cobrancaConfigurada ? 'Configurada' : 'Não configurada'}</dd></div>
      </dl>
      <Button variant="secondary" onClick={() => toast('Upgrade de plano ainda não está disponível.', 'info')}>
        Fazer upgrade
      </Button>
    </div>
  )
}

function SegurancaSection({ onSair }: { onSair: () => void }) {
  const qc = useQueryClient()
  const { data: perfil } = useQuery({ queryKey: ['perfil'], queryFn: () => usuariosService.obterPerfil() })
  const { data: sessoes = [] } = useQuery({ queryKey: ['sessoes'], queryFn: () => usuariosService.listarSessoes() })
  const [setup, setSetup] = useState<{ secret: string; provisioningUri: string } | null>(null)
  const [codigo, setCodigo] = useState('')

  const iniciarSetup = useMutation({
    mutationFn: () => usuariosService.setup2fa(),
    onSuccess: (data) => setSetup(data),
  })

  const habilitar = useMutation({
    mutationFn: () => usuariosService.habilitar2fa(codigo),
    onSuccess: () => { setSetup(null); setCodigo(''); qc.invalidateQueries({ queryKey: ['perfil'] }); toast('2FA ativado.', 'success') },
    onError: () => toast('Código inválido.', 'error'),
  })

  const desabilitar = useMutation({
    mutationFn: () => usuariosService.desabilitar2fa(codigo),
    onSuccess: () => { setCodigo(''); qc.invalidateQueries({ queryKey: ['perfil'] }); toast('2FA desativado.', 'success') },
    onError: () => toast('Código inválido.', 'error'),
  })

  const revogarSessao = useMutation({
    mutationFn: (id: string) => usuariosService.revogarSessao(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessoes'] }),
  })

  return (
    <div className="settings-section-body">
      <p className="section-label-lg" style={{ fontSize: 14 }}>Autenticação em duas etapas</p>
      {perfil?.twoFactorEnabled ? (
        <>
          <p style={{ fontSize: 13, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={15} /> 2FA está ativado nesta conta.
          </p>
          <label className="nc-field">Código do app autenticador (para desativar)<input value={codigo} onChange={(e) => setCodigo(e.target.value)} maxLength={6} placeholder="000000" /></label>
          <Button variant="secondary" onClick={() => desabilitar.mutate()} disabled={codigo.length !== 6 || desabilitar.isPending}>
            Desativar 2FA
          </Button>
        </>
      ) : setup ? (
        <>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Escaneie ou cadastre manualmente no seu app autenticador (Google Authenticator, Authy, etc.):</p>
          <code className="settings-code-block">{setup.secret}</code>
          <p style={{ fontSize: 11, color: 'var(--muted)', wordBreak: 'break-all' }}>{setup.provisioningUri}</p>
          <label className="nc-field">Código gerado pelo app<input value={codigo} onChange={(e) => setCodigo(e.target.value)} maxLength={6} placeholder="000000" /></label>
          <Button onClick={() => habilitar.mutate()} disabled={codigo.length !== 6 || habilitar.isPending}>
            Confirmar e ativar
          </Button>
        </>
      ) : (
        <Button onClick={() => iniciarSetup.mutate()} disabled={iniciarSetup.isPending}>
          <KeyRound size={15} /> Ativar 2FA
        </Button>
      )}

      <div className="settings-divider" />

      <p className="section-label-lg" style={{ fontSize: 14 }}>Sessões ativas</p>
      <div className="settings-member-list">
        {sessoes.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)' }}>Nenhuma sessão ativa.</p>}
        {sessoes.map((s) => (
          <div className="settings-member-row" key={s.id}>
            <div>
              <strong>Sessão desde {formatDate(s.createdAt)}</strong>
              <p>Expira em {formatDate(s.expiresAt)}</p>
            </div>
            <button className="icon-btn danger" title="Revogar" onClick={() => revogarSessao.mutate(s.id)}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="settings-divider" />

      <div className="settings-danger-row">
        <div>
          <strong>Encerrar sessão</strong>
          <p>Você será desconectado da Orbian neste dispositivo.</p>
        </div>
        <Button variant="secondary" onClick={onSair}>
          <LogOut size={15} /> Sair
        </Button>
      </div>
    </div>
  )
}
