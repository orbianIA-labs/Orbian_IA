import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Bot, CheckCircle2, Circle, Copy, Download,
  FileText, Loader2, Save, Sparkles, Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { OrbianEditor } from '@/components/editor/OrbianEditor'
import api from '@/lib/axios'
import { casesService } from '@/services/cases.service'
import { documentosService } from '@/services/documentos.service'

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

type CopilotTab = 'ia' | 'fontes' | 'auditoria' | 'estrutura' | 'historico'

const TIPOS_PECA = [
  'Contestação', 'Petição Inicial', 'Réplica', 'Manifestação',
  'Embargos de Declaração', 'Agravo de Instrumento', 'Apelação',
  'Recurso Ordinário', 'Mandado de Segurança', 'Outros',
]

export function PecasPage() {
  const { id: casoId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [categoria, setCategoria] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [instrucoes, setInstrucoes] = useState('')
  const [pecaSelecionada, setPecaSelecionada] = useState<PecaGerada | null>(null)
  const [editedContent, setEditedContent] = useState('')
  const [copilotTab, setCopilotTab] = useState<CopilotTab>('ia')
  const [copilotPrompt, setCopilotPrompt] = useState('')
  const [copilotResponse, setCopilotResponse] = useState<string | null>(null)
  const [gerando, setGerando] = useState(false)

  const { data: caso } = useQuery({
    queryKey: ['case', casoId],
    queryFn: () => casesService.get(casoId!),
    enabled: !!casoId,
  })

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

  const { data: documentos = [] } = useQuery({
    queryKey: ['documentos', casoId],
    queryFn: () => documentosService.list(casoId!),
    enabled: !!casoId,
  })
  const semDocumentos = documentos.length === 0

  useEffect(() => {
    setEditedContent(pecaSelecionada?.conteudo ?? '')
  }, [pecaSelecionada])

  const gerar = useMutation({
    mutationFn: () =>
      api.post<PecaGerada>(`/api/casos/${casoId}/pecas/gerar`, {
        casoId,
        categoria,
        descricaoSolicitacao: categoria,
        instrucoesAdicionais: instrucoes || null,
        templateId: templateId || null,
      }).then((r) => r.data),
    onSuccess: (peca) => {
      qc.invalidateQueries({ queryKey: ['pecas', casoId] })
      setPecaSelecionada(peca)
      setCategoria('')
      setTemplateId('')
      setInstrucoes('')
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
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"/></head><body>${editedContent}</body></html>`
    const blob = new Blob([html], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${pecaSelecionada.categoria.replace(/\s+/g, '_')}_v${pecaSelecionada.versao}.doc`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportarPdf() {
    if (!pecaSelecionada) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<html><head><meta charset="utf-8"/><title>${pecaSelecionada.categoria}</title>
      <style>body{font-family:Georgia,serif;line-height:1.6;max-width:720px;margin:40px auto;padding:0 24px;color:#111}</style>
      </head><body>${editedContent}</body></html>`)
    win.document.close()
    win.focus()
    win.print()
  }

  async function enviarParaCopilot() {
    if (!copilotPrompt.trim() || gerando) return
    setGerando(true)
    setCopilotResponse(null)
    try {
      const { data } = await api.post<{ resposta: string }>(`/api/casos/${casoId}/pecas/copilot`, {
        prompt: copilotPrompt,
        pecaConteudo: editedContent || null,
      })
      setCopilotResponse(data.resposta)
      setCopilotPrompt('')
    } catch {
      setCopilotResponse('Não foi possível consultar a IA agora. Tente novamente em instantes.')
    } finally {
      setGerando(false)
    }
  }

  return (
    <div className="pecas-layout">
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
            disabled={!categoria || gerar.isPending || semDocumentos}
            title={semDocumentos ? 'Adicione ao menos 1 documento ao caso para gerar peças.' : undefined}
          >
            {gerar.isPending ? <><Loader2 size={15} className="spin" /> Gerando...</> : <><Sparkles size={15} /> Gerar peça com IA</>}
          </Button>

          {semDocumentos && (
            <p style={{ color: 'var(--warning)', fontSize: 12, marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
              <FileText size={12} /> Anexe ao menos 1 documento ao caso para liberar a geração de peças.
            </p>
          )}

          {gerar.isError && (
            <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8 }}>
              {(gerar.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro ao gerar. Tente novamente.'}
            </p>
          )}
        </div>

        {/* ── Lista de peças geradas ── */}
        <div className="pecas-list-section">
          <p className="section-label" style={{ marginBottom: 8 }}>PEÇAS GERADAS</p>
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
          {/* ── Editor ── */}
          <div className="pecas-editor-main">
            <div className="pecas-editor-topbar">
              <div>
                <h2 style={{ fontSize: 16, margin: 0 }}>{pecaSelecionada.categoria}</h2>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>v{pecaSelecionada.versao}</span>
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
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto' }}>
              <OrbianEditor
                key={pecaSelecionada.id}
                content={pecaSelecionada.conteudo}
                onChange={setEditedContent}
              />
            </div>

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
                onClick={() => salvar.mutate()}
                disabled={salvar.isPending || editedContent === pecaSelecionada.conteudo}
                style={{ fontSize: 13 }}
              >
                <Save size={14} /> {salvar.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate(`/cases/${casoId}`)}
                style={{ fontSize: 13 }}
              >
                <CheckCircle2 size={14} /> Concluir execução
              </Button>
            </div>
          </div>

          {/* ── Copilot IA (WF09) ── */}
          <aside className="copilot-panel">
            <div className="copilot-tabs">
              {([
                ['ia', 'IA'],
                ['fontes', 'Fontes'],
                ['auditoria', 'Auditoria'],
                ['estrutura', 'Estrutura'],
                ['historico', 'Histórico'],
              ] as [CopilotTab, string][]).map(([key, label]) => (
                <button
                  key={key}
                  className={`copilot-tab ${copilotTab === key ? 'active' : ''}`}
                  onClick={() => setCopilotTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="copilot-content">
              {copilotTab === 'ia' && (
                <div className="copilot-ia">
                  <div className="copilot-ia-header">
                    <Bot size={16} style={{ color: 'var(--c-primary)' }} />
                    <strong>Copilot IA</strong>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 12 }}>
                    Peça ajuda para melhorar a peça, sugerir argumentos ou revisar trechos.
                  </p>

                  {copilotResponse && (
                    <div className="copilot-response">
                      <p style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{copilotResponse}</p>
                    </div>
                  )}

                  <textarea
                    className="copilot-input"
                    placeholder="Ex.: Sugira argumentos para o pedido de danos morais..."
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
              )}

              {copilotTab === 'fontes' && (
                <div>
                  <p className="section-label" style={{ marginBottom: 10 }}>FONTES JURÍDICAS</p>
                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                    Legislação e jurisprudência relevante para esta peça será listada aqui após a geração.
                  </p>
                </div>
              )}

              {copilotTab === 'auditoria' && (
                <div>
                  <p className="section-label" style={{ marginBottom: 10 }}>AUDITORIA</p>
                  <div className="copilot-audit-item ok">
                    <CheckCircle2 size={14} /> Estrutura da peça verificada
                  </div>
                  <div className="copilot-audit-item ok">
                    <CheckCircle2 size={14} /> Formatação conforme padrão
                  </div>
                  <div className="copilot-audit-item warn">
                    <Circle size={14} /> Revise o pedido final
                  </div>
                </div>
              )}

              {copilotTab === 'estrutura' && (
                <div>
                  <p className="section-label" style={{ marginBottom: 10 }}>ESTRUTURA</p>
                  {['Endereçamento', 'Qualificação das partes', 'Dos fatos', 'Do direito', 'Dos pedidos', 'Encerramento'].map((s) => (
                    <div key={s} className="copilot-struct-item">
                      <Circle size={12} style={{ color: 'var(--c-primary)' }} />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              )}

              {copilotTab === 'historico' && (
                <div>
                  <p className="section-label" style={{ marginBottom: 10 }}>HISTÓRICO</p>
                  <p style={{ fontSize: 13, color: 'var(--muted)' }}>v{pecaSelecionada.versao} — versão atual</p>
                </div>
              )}
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
