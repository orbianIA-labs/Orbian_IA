import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Bot, CheckCircle2, Circle, Copy, Download,
  FileText, Layers, Loader2, Maximize2, Minimize2, Plus, Save, Scale, Sparkles, Trash2, Wand2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { OrbianEditor } from '@/components/editor/OrbianEditor'
import api from '@/lib/axios'
import { casesService } from '@/services/cases.service'
import { escritorioService } from '@/services/escritorio.service'
import { usuariosService } from '@/services/usuarios.service'
import { toast } from '@/store/toastStore'
import { extrairSecaoHtml, MODULOS_PECA as MODULOS } from '@/lib/pecaSections'

interface PecaGerada {
  id: string
  casoId: string
  categoria: string
  conteudo: string
  versao: number
  promptReferencia: string
  createdAt: string
}

interface TemplatePeca {
  id: string
  categoria: string
  titulo: string
  tags: string[]
}

const TIPOS_PECA = [
  'Contestação', 'Petição Inicial', 'Réplica', 'Manifestação',
  'Embargos de Declaração', 'Agravo de Instrumento', 'Apelação',
  'Recurso Ordinário', 'Mandado de Segurança', 'Alvará', 'Outros',
]

type ToggleKey = 'fortalecer' | 'jurisprudencia' | 'clareza' | 'contraArgumentacao'

const TOGGLES_INFO: { key: ToggleKey; label: string }[] = [
  { key: 'fortalecer', label: 'Fortalecer fundamentação' },
  { key: 'jurisprudencia', label: 'Inserir jurisprudência' },
  { key: 'clareza', label: 'Melhorar clareza' },
  { key: 'contraArgumentacao', label: 'Contra-argumentação' },
]

const TOGGLE_INSTRUCOES: Record<ToggleKey, string> = {
  fortalecer: 'Fortaleça a fundamentação jurídica com mais embasamento legal.',
  jurisprudencia: 'Inclua referências a jurisprudência aplicável, quando pertinente.',
  clareza: 'Priorize clareza e simplicidade na linguagem.',
  contraArgumentacao: 'Antecipe e refute possíveis contra-argumentos da parte contrária.',
}

export function PecasPage() {
  const { id: casoId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [categoria, setCategoria] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [instrucoes, setInstrucoes] = useState('')
  const [dadosBancarios, setDadosBancarios] = useState({ banco: '', agencia: '', conta: '', tipoConta: 'Corrente', titular: '', cpfCnpjTitular: '' })
  const [leiInput, setLeiInput] = useState('')
  const [mostrarLeiInput, setMostrarLeiInput] = useState(false)
  const [pecaSelecionada, setPecaSelecionada] = useState<PecaGerada | null>(null)
  const [editedContent, setEditedContent] = useState('')
  const [copilotPrompt, setCopilotPrompt] = useState('')
  const [gerando, setGerando] = useState(false)
  const [editorRevision, setEditorRevision] = useState(0)
  const [toggles, setToggles] = useState<Record<ToggleKey, boolean>>({
    fortalecer: false, jurisprudencia: false, clareza: false, contraArgumentacao: false,
  })
  const [togglesCarregados, setTogglesCarregados] = useState(false)

  const { data: iaPreferencias } = useQuery({
    queryKey: ['ia-preferencias'],
    queryFn: () => usuariosService.obterIaPreferencias(),
  })

  useEffect(() => {
    if (!iaPreferencias || togglesCarregados) return
    setToggles({
      fortalecer: iaPreferencias.fortalecerFundamentacao,
      jurisprudencia: iaPreferencias.sugerirJurisprudencia,
      clareza: iaPreferencias.verificarClareza,
      contraArgumentacao: iaPreferencias.contraArgumentacao,
    })
    setTogglesCarregados(true)
  }, [iaPreferencias, togglesCarregados])
  const [moduloAtivo, setModuloAtivo] = useState<string | null>(null)
  const [expandido, setExpandido] = useState(false)
  const [mostrarNovaPeca, setMostrarNovaPeca] = useState(true)
  const editorContainerRef = useRef<HTMLDivElement>(null)

  const { data: caso } = useQuery({
    queryKey: ['case', casoId],
    queryFn: () => casesService.get(casoId!),
    enabled: !!casoId,
  })

  const { data: escritorio } = useQuery({
    queryKey: ['escritorio'],
    queryFn: () => escritorioService.obter(),
  })

  function timbreHtml() {
    if (!escritorio?.logoUrl) return ''
    const align = escritorio.timbrePosicao === 'esquerda' ? 'left' : escritorio.timbrePosicao === 'direita' ? 'right' : 'center'
    return `<div style="text-align:${align};margin-bottom:20px;"><img src="${escritorio.logoUrl}" style="max-height:70px;max-width:220px;" /></div>`
  }

  function rodapeHtml() {
    if (!escritorio || (!escritorio.endereco && !escritorio.telefone)) return ''
    const linha = [escritorio.nome, escritorio.endereco, escritorio.telefone].filter(Boolean).join(' · ')
    return `<div style="margin-top:32px;padding-top:10px;border-top:1px solid #ccc;font-size:11px;color:#666;text-align:center;">${linha}</div>`
  }

  const { data: pecas = [], isLoading } = useQuery<PecaGerada[]>({
    queryKey: ['pecas', casoId],
    queryFn: () => api.get(`/api/casos/${casoId}/pecas`).then((r) => r.data),
    enabled: !!casoId,
  })

  const { data: templates = [] } = useQuery<TemplatePeca[]>({
    queryKey: ['templates', categoria],
    queryFn: () => api.get('/api/templates', { params: { categoria } }).then((r) => r.data),
    enabled: !!categoria,
  })

  useEffect(() => {
    setEditedContent(pecaSelecionada?.conteudo ?? '')
    setModuloAtivo(null)
    setEditorRevision((r) => r + 1)
    if (pecaSelecionada) setMostrarNovaPeca(false)
  }, [pecaSelecionada])

  function instrucoesCompletas() {
    const partes = [instrucoes]
    if (categoria === 'Alvará') {
      const { banco, agencia, conta, tipoConta, titular, cpfCnpjTitular } = dadosBancarios
      if (banco || conta) {
        partes.push(
          `Inclua os dados bancários para expedição do alvará: Banco: ${banco || '[não informado]'}, ` +
          `Agência: ${agencia || '[não informado]'}, Conta ${tipoConta}: ${conta || '[não informado]'}, ` +
          `Titular: ${titular || '[não informado]'}, CPF/CNPJ do titular: ${cpfCnpjTitular || '[não informado]'}.`,
        )
      }
    }
    return partes.filter(Boolean).join(' ') || null
  }

  const gerar = useMutation({
    mutationFn: () =>
      api.post<PecaGerada>(`/api/casos/${casoId}/pecas/gerar`, {
        casoId,
        categoria,
        descricaoSolicitacao: categoria,
        instrucoesAdicionais: instrucoesCompletas(),
        templateId: templateId || null,
      }).then((r) => r.data),
    onSuccess: (peca) => {
      qc.invalidateQueries({ queryKey: ['pecas', casoId] })
      setPecaSelecionada(peca)
      setCategoria('')
      setTemplateId('')
      setInstrucoes('')
      setDadosBancarios({ banco: '', agencia: '', conta: '', tipoConta: 'Corrente', titular: '', cpfCnpjTitular: '' })
    },
  })

  const salvar = useMutation({
    mutationFn: () =>
      api.patch<PecaGerada>(`/api/casos/${casoId}/pecas/${pecaSelecionada!.id}`, {
        conteudo: editedContent,
      }).then((r) => r.data),
    onSuccess: (peca) => {
      qc.invalidateQueries({ queryKey: ['pecas', casoId] })
      setPecaSelecionada(peca)
    },
  })

  const avancarRevisao = useMutation({
    mutationFn: async () => {
      if (pecaSelecionada && editedContent !== pecaSelecionada.conteudo) {
        await api.patch(`/api/casos/${casoId}/pecas/${pecaSelecionada.id}`, { conteudo: editedContent })
      }
      return casesService.update(casoId!, { etapaAtual: 'revisao' })
    },
    onSuccess: () => navigate(`/cases/${casoId}`),
  })

  const deletar = useMutation({
    mutationFn: (pecaId: string) => api.delete(`/api/casos/${casoId}/pecas/${pecaId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pecas', casoId] })
      setPecaSelecionada(null)
    },
  })

  function copiarTexto() {
    const tmp = document.createElement('div')
    tmp.innerHTML = editedContent
    navigator.clipboard.writeText(tmp.innerText)
  }

  function exportarWord() {
    if (!pecaSelecionada) return
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"/></head><body>${timbreHtml()}${editedContent}${rodapeHtml()}</body></html>`
    const blob = new Blob([html], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${pecaSelecionada.categoria.replace(/\s+/g, '_')}_v${pecaSelecionada.versao}.doc`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function exportarPdf() {
    if (!pecaSelecionada) return
    const container = document.createElement('div')
    container.innerHTML = timbreHtml() + editedContent + rodapeHtml()
    container.style.cssText = 'font-family:Georgia,serif;line-height:1.6;max-width:720px;color:#111;padding:0 24px'
    const html2pdf = (await import('html2pdf.js')).default
    await html2pdf()
      .set({
        margin: 15,
        filename: `${pecaSelecionada.categoria.replace(/\s+/g, '_')}_v${pecaSelecionada.versao}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(container)
      .save()
  }

  // A IA aplica a instrução diretamente no conteúdo da peça (não devolve só um texto para copiar).
  async function executarInstrucao(instrucao: string) {
    if (gerando || !pecaSelecionada) return
    setGerando(true)
    try {
      const { data } = await api.post<{ conteudo: string }>(
        `/api/casos/${casoId}/pecas/${pecaSelecionada.id}/editar-ia`,
        { instrucao, conteudoAtual: editedContent },
      )
      setEditedContent(data.conteudo)
      setEditorRevision((r) => r + 1)
      setModuloAtivo(null)
      toast('A IA aplicou a edição na peça. Revise e clique em Salvar.', 'success')
    } catch {
      toast('Não foi possível aplicar a edição agora. Tente novamente em instantes.', 'error')
    } finally {
      setGerando(false)
    }
  }

  async function enviarParaCopilot() {
    if (!copilotPrompt.trim() || gerando) return
    await executarInstrucao(copilotPrompt)
    setCopilotPrompt('')
  }

  // Ações rápidas: montam uma instrução real a partir da ação + toggles ativos e aplicam via IA.
  function executarAcaoRapida(base: string) {
    const extras = TOGGLES_INFO.filter((t) => toggles[t.key]).map((t) => TOGGLE_INSTRUCOES[t.key])
    const instrucao = [base, ...extras].join(' ')
    executarInstrucao(instrucao)
  }

  function moduloPresente(termos: string[]) {
    return extrairSecaoHtml(editedContent, termos) !== null
  }

  const secaoModuloAtivo = moduloAtivo
    ? extrairSecaoHtml(editedContent, MODULOS.find((m) => m.nome === moduloAtivo)?.termos ?? [])
    : null

  return (
    <div className={`pecas-layout ${expandido ? 'expanded' : ''}`}>
      {/* ── Painel esquerdo: seleção de peças ── */}
      <aside className="pecas-sidebar">
        <div className="pecas-sidebar-header">
          <button className="back-btn" onClick={() => navigate(`/cases/${casoId}`)}>
            <ArrowLeft size={15} /> Voltar
          </button>
          {caso && (
            <div style={{ marginTop: 8 }}>
              <p className="eyebrow" style={{ marginBottom: 2 }}>Peças com IA</p>
              <h2 style={{ fontSize: 16 }}>{caso.title || caso.clientName}</h2>
            </div>
          )}
        </div>

        {/* ── Formulário de geração ── */}
        {mostrarNovaPeca && (
        <div className="pecas-gen-form">
          <p className="section-label" style={{ marginBottom: 10 }}>NOVA PEÇA</p>

          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
            Tipo de peça
          </label>
          <select
            value={categoria}
            onChange={(e) => { setCategoria(e.target.value); setTemplateId('') }}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 13, marginBottom: 10 }}
          >
            <option value="">Selecione o tipo...</option>
            {TIPOS_PECA.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          {categoria === 'Alvará' && (
            <div className="pecas-dados-bancarios">
              <p style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Dados bancários para o alvará</p>
              <div className="pecas-dados-bancarios-grid">
                <input placeholder="Banco" value={dadosBancarios.banco} onChange={(e) => setDadosBancarios({ ...dadosBancarios, banco: e.target.value })} />
                <input placeholder="Agência" value={dadosBancarios.agencia} onChange={(e) => setDadosBancarios({ ...dadosBancarios, agencia: e.target.value })} />
                <input placeholder="Conta" value={dadosBancarios.conta} onChange={(e) => setDadosBancarios({ ...dadosBancarios, conta: e.target.value })} />
                <select value={dadosBancarios.tipoConta} onChange={(e) => setDadosBancarios({ ...dadosBancarios, tipoConta: e.target.value })}>
                  <option value="Corrente">Conta Corrente</option>
                  <option value="Poupança">Conta Poupança</option>
                </select>
                <input placeholder="Titular" value={dadosBancarios.titular} onChange={(e) => setDadosBancarios({ ...dadosBancarios, titular: e.target.value })} />
                <input placeholder="CPF/CNPJ do titular" value={dadosBancarios.cpfCnpjTitular} onChange={(e) => setDadosBancarios({ ...dadosBancarios, cpfCnpjTitular: e.target.value })} />
              </div>
            </div>
          )}

          {categoria && templates.length > 0 && (
            <>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Modelo (opcional)
              </label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 13, marginBottom: 10 }}
              >
                <option value="">Automático ({templates.length} disponíveis)</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.titulo}</option>)}
              </select>
            </>
          )}

          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
            Instruções adicionais
          </label>
          <textarea
            placeholder="Ex.: incluir pedido de tutela antecipada, mencionar garantia do produto..."
            value={instrucoes}
            onChange={(e) => setInstrucoes(e.target.value)}
            rows={3}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', marginBottom: 10, boxSizing: 'border-box' }}
          />

          <Button
            style={{ width: '100%', justifyContent: 'center', background: 'var(--grad-primary)' }}
            onClick={() => gerar.mutate()}
            disabled={!categoria || gerar.isPending}
          >
            {gerar.isPending ? <><Loader2 size={15} className="spin" /> Gerando...</> : <><Sparkles size={15} /> Gerar peça com IA</>}
          </Button>

          {gerar.isError && (
            <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8 }}>
              {(gerar.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro ao gerar. Tente novamente.'}
            </p>
          )}
        </div>
        )}

        {/* ── Lista de peças geradas ── */}
        <div className="pecas-list-section">
          <div className="section-head" style={{ marginBottom: 8 }}>
            <p className="section-label" style={{ margin: 0 }}>PEÇAS GERADAS</p>
            {!mostrarNovaPeca && (
              <button
                className="pecas-new-toggle"
                onClick={() => setMostrarNovaPeca(true)}
                aria-label="Gerar nova peça"
                title="Gerar nova peça"
              >
                <Plus size={14} />
              </button>
            )}
          </div>
          {isLoading && <p style={{ fontSize: 13, color: 'var(--muted)' }}>Carregando...</p>}
          {!isLoading && pecas.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>Nenhuma peça gerada ainda.</p>
          )}
          {pecas.map((peca) => (
            <div
              key={peca.id}
              className={`pecas-list-item ${pecaSelecionada?.id === peca.id ? 'active' : ''}`}
              onClick={() => setPecaSelecionada(peca)}
            >
              <div className="pecas-list-item-info">
                <FileText size={14} style={{ color: 'var(--c-primary)', flexShrink: 0 }} />
                <div>
                  <strong>{peca.categoria}</strong>
                  <span>v{peca.versao}</span>
                </div>
              </div>
              <button
                className="pecas-delete-btn"
                onClick={(e) => { e.stopPropagation(); deletar.mutate(peca.id) }}
                aria-label="Excluir"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Editor + Copilot ── */}
      {pecaSelecionada ? (
        <div className="pecas-editor-area">
          {/* ── Estrutura da Peça ── */}
          <aside className="pecas-modules-panel">
            <div className="section-head" style={{ marginBottom: 10 }}>
              <p className="section-label" style={{ margin: 0 }}>ESTRUTURA DA PEÇA</p>
            </div>
            <button
              className={`pecas-module-item ${moduloAtivo === null ? 'active' : ''}`}
              onClick={() => setModuloAtivo(null)}
            >
              <Layers size={15} />
              Visualizar a peça inteira
            </button>
            {MODULOS.map((m) => {
              const presente = moduloPresente(m.termos)
              return (
                <button
                  key={m.nome}
                  className={`pecas-module-item ${presente ? 'done' : ''} ${moduloAtivo === m.nome ? 'active' : ''}`}
                  onClick={() => setModuloAtivo(m.nome)}
                >
                  {presente ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                  {m.nome}
                </button>
              )
            })}
            <p className="pecas-module-hint">Clique em um módulo para ver apenas esse trecho da peça.</p>
          </aside>

          {/* ── Editor ── */}
          <div className="pecas-editor-main">
            <div className="pecas-editor-topbar">
              <div>
                <h2 style={{ fontSize: 16, margin: 0 }}>{pecaSelecionada.categoria}</h2>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  v{pecaSelecionada.versao}{moduloAtivo ? ` · ${moduloAtivo}` : ''}
                </span>
              </div>
              <div className="button-row" style={{ margin: 0 }}>
                <Button variant="secondary" style={{ fontSize: 12 }} onClick={copiarTexto}>
                  <Copy size={13} /> Copiar
                </Button>
                <Button variant="secondary" style={{ fontSize: 12 }} onClick={exportarWord}>
                  <Download size={13} /> Word
                </Button>
                <Button variant="secondary" style={{ fontSize: 12 }} onClick={exportarPdf}>
                  <Download size={13} /> PDF
                </Button>
                <Button
                  variant="secondary"
                  style={{ fontSize: 12 }}
                  onClick={() => setExpandido((v) => !v)}
                  title={expandido ? 'Restaurar layout' : 'Visualizar peça inteira'}
                >
                  {expandido ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                </Button>
              </div>
            </div>

            {moduloAtivo ? (
              <div className="pecas-modulo-preview">
                {secaoModuloAtivo ? (
                  <div dangerouslySetInnerHTML={{ __html: secaoModuloAtivo }} />
                ) : (
                  <p className="pecas-module-hint">Este trecho ainda não foi identificado no texto gerado.</p>
                )}
              </div>
            ) : (
              <div ref={editorContainerRef} style={{ flex: 1, overflow: 'auto' }}>
                <OrbianEditor
                  key={`${pecaSelecionada.id}-${editorRevision}`}
                  content={editedContent}
                  onChange={setEditedContent}
                />
              </div>
            )}

            {/* ── Bottom bar (WF09) ── */}
            <div className="editor-bottom-bar">
              <Button
                variant="secondary"
                onClick={exportarWord}
                style={{ fontSize: 13 }}
              >
                <Download size={14} /> Exportar DOCX
              </Button>
              <Button
                variant="secondary"
                onClick={exportarPdf}
                style={{ fontSize: 13 }}
              >
                <Download size={14} /> Exportar PDF
              </Button>
              <div style={{ flex: 1 }} />
              <Button
                variant="secondary"
                onClick={() => salvar.mutate()}
                disabled={salvar.isPending || editedContent === pecaSelecionada.conteudo}
                style={{ fontSize: 13 }}
              >
                <Save size={14} /> {salvar.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button
                onClick={() => avancarRevisao.mutate()}
                disabled={avancarRevisao.isPending}
                style={{ fontSize: 13 }}
              >
                <CheckCircle2 size={14} /> {avancarRevisao.isPending ? 'Avançando...' : 'Avançar para Revisão'}
              </Button>
            </div>
          </div>

          {/* ── Copilot IA (WF09) ── */}
          <aside className="copilot-panel">
            <div className="copilot-content">
              <div className="copilot-ia">
                <div className="copilot-ia-header">
                  <Bot size={16} style={{ color: 'var(--c-primary)' }} />
                  <strong>Copilot IA</strong>
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 12 }}>
                  Peça ajuda para melhorar a peça, sugerir argumentos ou revisar trechos.
                </p>

                <p className="section-label" style={{ marginBottom: 8 }}>FUNÇÕES ATIVAS</p>
                <div className="copilot-toggles">
                  {TOGGLES_INFO.map((t) => (
                    <label key={t.key} className="copilot-toggle-row">
                      <span>{t.label}</span>
                      <input
                        type="checkbox"
                        checked={toggles[t.key]}
                        onChange={(e) => setToggles((prev) => ({ ...prev, [t.key]: e.target.checked }))}
                      />
                    </label>
                  ))}
                </div>

                <p className="section-label" style={{ margin: '14px 0 8px' }}>AÇÕES RÁPIDAS</p>
                <div className="copilot-quick-actions">
                  <button disabled={gerando} onClick={() => executarAcaoRapida('Melhore a argumentação jurídica de toda a peça, tornando-a mais persuasiva e tecnicamente sólida.')}>
                    <Wand2 size={13} /> Melhorar argumentação
                  </button>
                  <button disabled={gerando} onClick={() => executarAcaoRapida('Reescreva a peça de forma mais clara e objetiva, mantendo o sentido jurídico.')}>
                    <Sparkles size={13} /> Reescrever
                  </button>
                  <button disabled={gerando} onClick={() => executarAcaoRapida('Expanda a peça, adicionando mais fundamentação e detalhamento onde fizer sentido.')}>
                    <Plus size={13} /> Expandir
                  </button>
                  <button disabled={gerando} onClick={() => executarAcaoRapida('Resuma a peça, mantendo os pontos jurídicos essenciais e a estrutura de seções.')}>
                    <FileText size={13} /> Resumir
                  </button>
                  <button disabled={gerando} onClick={() => executarAcaoRapida('Insira jurisprudência aplicável na Fundamentação Jurídica da peça.')}>
                    <Scale size={13} /> Inserir jurisprudência
                  </button>
                  <button disabled={gerando} onClick={() => setMostrarLeiInput((v) => !v)}>
                    <Scale size={13} /> Adicionar lei
                  </button>
                </div>

                {mostrarLeiInput && (
                  <div className="copilot-lei-row">
                    <input
                      placeholder="Ex.: Art. 5º, CDC / Lei 8.078/1990"
                      value={leiInput}
                      onChange={(e) => setLeiInput(e.target.value)}
                    />
                    <Button
                      style={{ fontSize: 12 }}
                      disabled={!leiInput.trim() || gerando}
                      onClick={() => {
                        executarInstrucao(`Cite e aplique "${leiInput}" no texto da peça, no trecho mais pertinente, com formatação de destaque.`)
                        setLeiInput('')
                        setMostrarLeiInput(false)
                      }}
                    >
                      Inserir
                    </Button>
                  </div>
                )}

                {gerando && (
                  <p className="copilot-applying"><Loader2 size={13} className="spin" /> A IA está aplicando a edição na peça...</p>
                )}

                <textarea
                  className="copilot-input"
                  placeholder="Ex.: Adicione o pedido de danos morais na peça..."
                  rows={4}
                  value={copilotPrompt}
                  onChange={(e) => setCopilotPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) enviarParaCopilot()
                  }}
                />
                <Button
                  style={{ width: '100%', justifyContent: 'center', fontSize: 13 }}
                  onClick={enviarParaCopilot}
                  disabled={!copilotPrompt.trim() || gerando}
                >
                  {gerando ? <><Loader2 size={13} className="spin" /> Pensando...</> : <><Sparkles size={13} /> Enviar</>}
                </Button>
              </div>
            </div>
          </aside>
        </div>
      ) : (
        <div className="pecas-empty">
          <Sparkles size={48} style={{ color: 'var(--c-primary)', opacity: 0.4 }} />
          <h3>Selecione ou gere uma peça</h3>
          <p>Escolha um tipo de peça no painel à esquerda e clique em "Gerar peça com IA".</p>
        </div>
      )}
    </div>
  )
}
