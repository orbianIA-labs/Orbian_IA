import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Image as ImageIcon, Maximize2, Trash2, Upload, X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { usuariosService } from '@/services/usuarios.service'
import { escritorioService, logoUrlDoEscritorio, type TimbrePosicao } from '@/services/escritorio.service'
import { FONTES, TAMANHOS } from '@/components/editor/OrbianEditor'
import { toast } from '@/store/toastStore'

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

/** Configurações é uma tela só: conta + escritório. */
export function ProfilePage() {
  return (
    <div className="settings-page">
      <header className="new-case-header">
        <div>
          <h1>Configurações</h1>
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>Gerencie sua conta e o escritório.</p>
        </div>
      </header>

      <div className="settings-scroll">
        <section className="new-case-card">
          <p className="section-label-lg" style={{ fontSize: 17 }}>Conta</p>
          <p className="new-case-card-sub">Dados pessoais, e-mail e senha.</p>
          <ContaSection />
        </section>

        <section className="new-case-card">
          <p className="section-label-lg" style={{ fontSize: 17 }}>Escritório</p>
          <p className="new-case-card-sub">Informações da banca e identidade visual.</p>
          <EscritorioSection />
        </section>
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

// Texto fictício usado só para dar uma ideia realista de como a peça fica com o timbre/tipografia/rodapé escolhidos.
const PECA_EXEMPLO_HTML = `
  <p style="text-align:center;font-weight:700;">EXMO. SR. DR. JUIZ DE DIREITO DA VARA CÍVEL DA COMARCA DE SÃO PAULO - SP</p>
  <p>Fulano de Tal, já qualificado nos autos, por seu advogado que esta subscreve, vem respeitosamente à presença de Vossa Excelência propor a presente ação, pelas razões de fato e de direito a seguir expostas.</p>
  <p><strong>Dos Fatos</strong></p>
  <p>Em breve síntese, o requerente firmou contrato com a parte requerida, cujas obrigações não foram devidamente cumpridas, causando-lhe prejuízos que ora se busca reparar por meio da presente demanda.</p>
  <p><strong>Do Direito</strong></p>
  <p>A pretensão encontra amparo na legislação vigente, notadamente nos princípios da boa-fé objetiva e da função social dos contratos, impondo-se o acolhimento integral do pedido.</p>
  <p><strong>Dos Pedidos</strong></p>
  <p>Ante o exposto, requer-se a procedência da ação, condenando-se a parte requerida ao cumprimento das obrigações pactuadas, além do pagamento das custas processuais e honorários advocatícios.</p>
  <p>Termos em que, pede deferimento.</p>
`.trim()

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
          <Button variant="secondary" style={{ fontSize: 12.5 }} onClick={() => setPreviewExpandida(true)}>
            <Maximize2 size={13} /> Pré-visualização
          </Button>
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
            <div
              className="escritorio-preview-page escritorio-preview-page-large escritorio-preview-page-exemplo"
              style={{ fontFamily: form.fonteFamilia || undefined, fontSize: form.fonteTamanho || undefined }}
            >
              {form.timbrePosicao.startsWith('superior') && (
                <div className={`escritorio-preview-logo align-${alinhamentoTimbre}`}>
                  {logoAtual ? <img src={logoAtual} alt="" /> : <span className="escritorio-preview-placeholder" />}
                </div>
              )}
              <div dangerouslySetInnerHTML={{ __html: PECA_EXEMPLO_HTML }} />
              {form.timbrePosicao.startsWith('inferior') && (
                <div className={`escritorio-preview-logo align-${alinhamentoTimbre}`}>
                  {logoAtual ? <img src={logoAtual} alt="" /> : <span className="escritorio-preview-placeholder" />}
                </div>
              )}
              {form.rodapeAtivo && (
                <div className="escritorio-preview-footer-texto">
                  {form.rodapeTexto || 'Rua Exemplo, 123 - São Paulo/SP · (11) 0000-0000'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
