import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Bot, Building2, ChevronRight, CreditCard, Image as ImageIcon, KeyRound, LogOut,
  Maximize2, Monitor, Moon, Plus, Shield, ShieldCheck, Sun, Trash2, Upload, User, Users, X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { authService } from '@/services/auth.service'
import { usuariosService, type IaPreferencias } from '@/services/usuarios.service'
import { escritorioService, logoUrlDoEscritorio, type TimbrePosicao } from '@/services/escritorio.service'
import { FONTES, TAMANHOS } from '@/components/editor/OrbianEditor'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore, type ThemeMode } from '@/store/themeStore'
import { toast } from '@/store/toastStore'
import { formatDate } from '@/lib/utils'

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

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
  const [searchParams] = useSearchParams()
  const sectionParam = searchParams.get('section') as SectionKey | null
  const [section, setSection] = useState<SectionKey | null>(
    sectionParam && SECTIONS.some((s) => s.key === sectionParam) ? sectionParam : null,
  )

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
          <section className={`new-case-card ${section === 'escritorio' ? 'new-case-card-escritorio' : ''}`}>
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

const TIMBRE_OPTIONS: { value: TimbrePosicao; label: string }[] = [
  { value: 'superior-esquerda', label: 'Superior esquerda' },
  { value: 'superior-centro', label: 'Superior centro' },
  { value: 'superior-direita', label: 'Superior direita' },
  { value: 'inferior-esquerda', label: 'Inferior esquerda' },
  { value: 'inferior-direita', label: 'Inferior direita' },
]

type EscritorioForm = {
  nome: string
  nomeAdvogado: string
  oab: string
  ufOab: string
  cnpj: string
  email: string
  telefone: string
  cidade: string
  estado: string
  timbrePosicao: TimbrePosicao
  fonteFamilia: string
  fonteTamanho: string
  rodapeTexto: string
  rodapeAtivo: boolean
}

const ESCRITORIO_FORM_VAZIO: EscritorioForm = {
  nome: '', nomeAdvogado: '', oab: '', ufOab: '', cnpj: '', email: '', telefone: '',
  cidade: '', estado: '', timbrePosicao: 'superior-centro', fonteFamilia: '', fonteTamanho: '',
  rodapeTexto: '', rodapeAtivo: true,
}

function EscritorioSection() {
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [previewExpandida, setPreviewExpandida] = useState(false)
  const { data: escritorio, isLoading } = useQuery({ queryKey: ['escritorio'], queryFn: () => escritorioService.obter() })
  const [form, setForm] = useState<EscritorioForm>(ESCRITORIO_FORM_VAZIO)
  const [carregado, setCarregado] = useState(false)

  function carregarDoServidor() {
    if (!escritorio) return
    setForm({
      nome: escritorio.nome,
      nomeAdvogado: escritorio.nomeAdvogado ?? '',
      oab: escritorio.oab ?? '',
      ufOab: escritorio.ufOab ?? '',
      cnpj: escritorio.cnpj ?? '',
      email: escritorio.email ?? '',
      telefone: escritorio.telefone ?? '',
      cidade: escritorio.cidade ?? '',
      estado: escritorio.estado ?? '',
      timbrePosicao: escritorio.timbrePosicao,
      fonteFamilia: escritorio.fonteFamilia ?? '',
      fonteTamanho: escritorio.fonteTamanho ?? '',
      rodapeTexto: escritorio.rodapeTexto ?? '',
      rodapeAtivo: escritorio.rodapeAtivo,
    })
  }

  if (!isLoading && escritorio && !carregado) {
    carregarDoServidor()
    setCarregado(true)
  }

  const salvar = useMutation({
    mutationFn: () => escritorioService.salvar({
      nome: form.nome,
      nomeAdvogado: form.nomeAdvogado || null,
      oab: form.oab || null,
      ufOab: form.ufOab || null,
      cnpj: form.cnpj || null,
      email: form.email || null,
      telefone: form.telefone || null,
      cidade: form.cidade || null,
      estado: form.estado || null,
      timbrePosicao: form.timbrePosicao,
      fonteFamilia: form.fonteFamilia || null,
      fonteTamanho: form.fonteTamanho || null,
      rodapeTexto: form.rodapeTexto || null,
      rodapeAtivo: form.rodapeAtivo,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['escritorio'] }); toast('Escritório salvo.', 'success') },
    onError: () => toast('Não foi possível salvar o escritório.', 'error'),
  })

  const uploadLogo = useMutation({
    mutationFn: (file: File) => escritorioService.uploadLogo(file),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['escritorio'] }); toast('Logo atualizada.', 'success') },
    onError: () => toast('Não foi possível enviar a imagem. Use PNG, JPEG ou SVG de até 5 MB.', 'error'),
  })

  const removerLogo = useMutation({
    mutationFn: () => escritorioService.removerLogo(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['escritorio'] }),
  })

  function handleLogoFiles(files: File[]) {
    if (files[0]) uploadLogo.mutate(files[0])
  }

  const logoAtual = escritorio
    ? (escritorio.temLogo ? logoUrlDoEscritorio(escritorio.id) : escritorio.logoUrl)
    : null

  const alinhamentoTimbre = form.timbrePosicao.endsWith('esquerda') ? 'left' : form.timbrePosicao.endsWith('direita') ? 'right' : 'center'

  return (
    <div className="escritorio-section">
      <div className="escritorio-section-scroll">
        <p className="section-label-lg" style={{ fontSize: 14 }}>Identificação</p>
        <div className="nc-field-pair">
          <label className="nc-field">Nome do advogado<input value={form.nomeAdvogado} onChange={(e) => setForm({ ...form, nomeAdvogado: e.target.value })} /></label>
          <label className="nc-field">Nome do escritório<input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Alves & Associados" /></label>
        </div>
        <div className="nc-field-trio">
          <label className="nc-field">OAB<input value={form.oab} onChange={(e) => setForm({ ...form, oab: e.target.value })} /></label>
          <label className="nc-field">
            UF da OAB
            <select value={form.ufOab} onChange={(e) => setForm({ ...form, ufOab: e.target.value })}>
              <option value="">Selecione</option>
              {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </label>
          <label className="nc-field">CNPJ<input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} /></label>
        </div>
        <div className="nc-field-pair">
          <label className="nc-field">E-mail<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label className="nc-field">Telefone<input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></label>
        </div>
        <div className="nc-field-pair">
          <label className="nc-field">Cidade<input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></label>
          <label className="nc-field">
            Estado
            <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
              <option value="">Selecione</option>
              {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </label>
        </div>

        <div className="settings-divider" />

        <p className="section-label-lg" style={{ fontSize: 14 }}>Timbre da Peça</p>
        <div
          className={`escritorio-dropzone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleLogoFiles(Array.from(e.dataTransfer.files ?? [])) }}
        >
          {logoAtual ? (
            <>
              <img src={logoAtual} alt="Logo do escritório" className="escritorio-logo-preview" />
              <div className="button-row" style={{ margin: 0 }}>
                <Button variant="secondary" style={{ fontSize: 12 }} onClick={() => fileInputRef.current?.click()} disabled={uploadLogo.isPending}>
                  {uploadLogo.isPending ? 'Enviando...' : 'Substituir'}
                </Button>
                <Button variant="secondary" style={{ fontSize: 12 }} onClick={() => removerLogo.mutate()} disabled={removerLogo.isPending}>
                  <Trash2 size={13} /> Remover
                </Button>
              </div>
            </>
          ) : (
            <>
              <ImageIcon size={28} style={{ opacity: 0.35 }} />
              <p style={{ fontSize: 12.5, color: 'var(--muted)', textAlign: 'center' }}>
                Arraste uma imagem ou clique para enviar (PNG, JPEG ou SVG, até 5 MB)
              </p>
              <Button variant="secondary" style={{ fontSize: 12 }} onClick={() => fileInputRef.current?.click()} disabled={uploadLogo.isPending}>
                <Upload size={13} /> {uploadLogo.isPending ? 'Enviando...' : 'Selecionar imagem'}
              </Button>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            style={{ display: 'none' }}
            onChange={(e) => { handleLogoFiles(Array.from(e.target.files ?? [])); e.target.value = '' }}
          />
        </div>

        <div className="escritorio-timbre-grid">
          {TIMBRE_OPTIONS.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`escritorio-timbre-card ${form.timbrePosicao === t.value ? 'active' : ''}`}
              onClick={() => setForm({ ...form, timbrePosicao: t.value })}
            >
              <span className={`escritorio-timbre-thumb pos-${t.value}`} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="settings-divider" />

        <p className="section-label-lg" style={{ fontSize: 14 }}>Tipografia da Peça</p>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: -8 }}>
          Define a fonte usada em todas as peças geradas.
        </p>
        <div className="escritorio-fonte-grid">
          {FONTES.map((f) => (
            <button
              key={f.label}
              type="button"
              className={`escritorio-fonte-card ${form.fonteFamilia === f.value ? 'active' : ''}`}
              style={{ fontFamily: f.value }}
              onClick={() => setForm({ ...form, fonteFamilia: f.value })}
            >
              <span className="escritorio-fonte-swatch">Aa</span>
              {f.label}
            </button>
          ))}
        </div>
        <label className="nc-field">
          Tamanho padrão
          <select value={form.fonteTamanho} onChange={(e) => setForm({ ...form, fonteTamanho: e.target.value })}>
            {TAMANHOS.map((t) => <option key={t.label} value={t.value}>{t.label}</option>)}
          </select>
        </label>

        <div className="settings-divider" />

        <p className="section-label-lg" style={{ fontSize: 14 }}>Rodapé das Peças</p>
        <label className="settings-toggle-row">
          <input type="checkbox" checked={form.rodapeAtivo} onChange={(e) => setForm({ ...form, rodapeAtivo: e.target.checked })} />
          Rodapé ativo nos documentos exportados
        </label>
        <label className="nc-field">
          Texto do rodapé
          <textarea
            rows={3}
            value={form.rodapeTexto}
            onChange={(e) => setForm({ ...form, rodapeTexto: e.target.value })}
            placeholder="Endereço completo, telefone, site..."
          />
        </label>

        <div className="settings-divider" />

        <div className="escritorio-preview-header">
          <p className="section-label-lg" style={{ fontSize: 14, margin: 0 }}>Pré-visualização</p>
          <button
            type="button"
            className="icon-btn"
            title="Expandir pré-visualização"
            onClick={() => setPreviewExpandida(true)}
          >
            <Maximize2 size={15} />
          </button>
        </div>
        <div className="escritorio-preview-page">
          {form.timbrePosicao.startsWith('superior') && (
            <div className={`escritorio-preview-logo align-${alinhamentoTimbre}`}>
              {logoAtual ? <img src={logoAtual} alt="" /> : <span className="escritorio-preview-placeholder" />}
            </div>
          )}
          <span className="escritorio-preview-bar" style={{ width: '90%' }} />
          <span className="escritorio-preview-bar" style={{ width: '70%' }} />
          <span className="escritorio-preview-bar" style={{ width: '85%' }} />
          <span className="escritorio-preview-bar" style={{ width: '60%' }} />
          {form.timbrePosicao.startsWith('inferior') && (
            <div className={`escritorio-preview-logo align-${alinhamentoTimbre}`}>
              {logoAtual ? <img src={logoAtual} alt="" /> : <span className="escritorio-preview-placeholder" />}
            </div>
          )}
          {form.rodapeAtivo && <div className="escritorio-preview-footer" />}
        </div>
      </div>

      <div className="escritorio-section-actions">
        <Button variant="secondary" onClick={carregarDoServidor} disabled={salvar.isPending}>
          Cancelar
        </Button>
        <Button onClick={() => salvar.mutate()} disabled={!form.nome || salvar.isPending}>
          {salvar.isPending ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>

      {previewExpandida && (
        <div className="escritorio-preview-modal-overlay" onClick={() => setPreviewExpandida(false)}>
          <div className="escritorio-preview-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="icon-btn escritorio-preview-modal-close"
              title="Fechar"
              onClick={() => setPreviewExpandida(false)}
            >
              <X size={16} />
            </button>
            <div className="escritorio-preview-page escritorio-preview-page-large">
              {form.timbrePosicao.startsWith('superior') && (
                <div className={`escritorio-preview-logo align-${alinhamentoTimbre}`}>
                  {logoAtual ? <img src={logoAtual} alt="" /> : <span className="escritorio-preview-placeholder" />}
                </div>
              )}
              <span className="escritorio-preview-bar" style={{ width: '90%' }} />
              <span className="escritorio-preview-bar" style={{ width: '70%' }} />
              <span className="escritorio-preview-bar" style={{ width: '85%' }} />
              <span className="escritorio-preview-bar" style={{ width: '60%' }} />
              {form.timbrePosicao.startsWith('inferior') && (
                <div className={`escritorio-preview-logo align-${alinhamentoTimbre}`}>
                  {logoAtual ? <img src={logoAtual} alt="" /> : <span className="escritorio-preview-placeholder" />}
                </div>
              )}
              {form.rodapeAtivo && <div className="escritorio-preview-footer" />}
            </div>
          </div>
        </div>
      )}
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
