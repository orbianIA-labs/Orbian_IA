import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Bot, Download, FileText, Plus, Sparkles, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { casesService } from '@/services/cases.service'
import { documentosService, type Documento } from '@/services/documentos.service'

const CATEGORIAS = ['Todos', 'Procuração', 'Contratos', 'Petições', 'Decisões', 'Sentenças', 'Recursos', 'Outros'] as const
type Categoria = (typeof CATEGORIAS)[number]

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentosPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [categoriaAtiva, setCategoriaAtiva] = useState<Categoria>('Todos')
  const [uploadCategoria, setUploadCategoria] = useState<Categoria>('Outros')
  const [forAI, setForAI] = useState<Set<string>>(new Set())
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const { data: legalCase } = useQuery({
    queryKey: ['case', id],
    queryFn: () => casesService.get(id!),
    enabled: !!id,
  })

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documentos', id],
    queryFn: () => documentosService.list(id!),
    enabled: !!id,
  })

  const upload = useMutation({
    mutationFn: (files: File[]) =>
      Promise.all(files.map((f) => documentosService.upload(id!, f, uploadCategoria))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documentos', id] })
      setErro(null)
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setErro(msg ?? 'Falha ao enviar o documento. Tente novamente.')
    },
  })

  const remover = useMutation({
    mutationFn: (docId: string) => documentosService.remove(docId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documentos', id] }),
  })

  const analisar = useMutation({
    mutationFn: (documentoIds: string[]) => documentosService.analisar(id!, documentoIds),
    onSuccess: (analise) => setAiSummary(analise),
    onError: () => setAiSummary('Não foi possível analisar os documentos agora. Tente novamente em instantes.'),
  })

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length) upload.mutate(files)
    e.target.value = ''
  }

  function toggleAI(docId: string) {
    setForAI((prev) => {
      const next = new Set(prev)
      if (next.has(docId)) next.delete(docId)
      else next.add(docId)
      return next
    })
  }

  const displayedDocs = categoriaAtiva === 'Todos'
    ? docs
    : docs.filter((d) => d.tipo === categoriaAtiva)

  const docsParaIA = docs.filter((d) => forAI.has(d.id))

  const counts = CATEGORIAS.reduce((acc, cat) => {
    acc[cat] = cat === 'Todos' ? docs.length : docs.filter((d) => d.tipo === cat).length
    return acc
  }, {} as Record<Categoria, number>)

  return (
    <div className="page-stack">
      <div className="doc-page-header">
        <button className="back-btn" onClick={() => navigate(`/cases/${id}`)}>
          <ArrowLeft size={16} /> Voltar ao caso
        </button>
        <div className="doc-page-title">
          <h1>Documentos</h1>
          {legalCase && <p className="eyebrow">{legalCase.clientName}</p>}
        </div>
        <div className="button-row" style={{ margin: 0 }}>
          <select
            value={uploadCategoria}
            onChange={(e) => setUploadCategoria(e.target.value as Categoria)}
            style={{ fontSize: 13, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--line)' }}
          >
            {CATEGORIAS.filter((c) => c !== 'Todos').map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <Button onClick={() => fileInputRef.current?.click()} disabled={upload.isPending}>
            <Upload size={15} /> {upload.isPending ? 'Enviando...' : 'Adicionar documento'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
            style={{ display: 'none' }}
            onChange={onFileChange}
          />
        </div>
      </div>

      {erro && <p style={{ color: 'var(--danger)', fontSize: 13, padding: '0 32px' }}>{erro}</p>}

      <div className="doc-page-layout">
        {/* ── Sidebar de categorias ── */}
        <aside className="doc-sidebar">
          <p className="section-label" style={{ marginBottom: 8 }}>CATEGORIAS</p>
          {CATEGORIAS.map((cat) => (
            <button
              key={cat}
              className={`doc-sidebar-item ${categoriaAtiva === cat ? 'active' : ''}`}
              onClick={() => setCategoriaAtiva(cat)}
            >
              <span>{cat}</span>
              {counts[cat] > 0 && <span className="doc-sidebar-count">{counts[cat]}</span>}
            </button>
          ))}
        </aside>

        {/* ── Lista de documentos ── */}
        <main className="doc-main">
          {isLoading ? (
            <div className="empty-state" style={{ minHeight: 200 }}>
              <FileText size={36} style={{ opacity: 0.3 }} />
              <p>Carregando documentos...</p>
            </div>
          ) : displayedDocs.length === 0 ? (
            <div className="empty-state" style={{ minHeight: 200 }}>
              <FileText size={36} style={{ opacity: 0.3 }} />
              <p>{categoriaAtiva === 'Todos' ? 'Nenhum documento adicionado.' : `Nenhum documento em ${categoriaAtiva}.`}</p>
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                <Plus size={14} /> Adicionar
              </Button>
            </div>
          ) : (
            <div className="doc-list">
              {displayedDocs.map((doc: Documento) => (
                <div key={doc.id} className={`doc-row ${forAI.has(doc.id) ? 'for-ai' : ''}`}>
                  <div className="doc-row-icon">
                    <FileText size={18} />
                  </div>
                  <div className="doc-row-info">
                    <strong>{doc.nomeArquivo}</strong>
                    <span>{doc.tipo ?? 'Outros'} · {formatSize(doc.tamanhoBytes)}</span>
                  </div>
                  <div className="doc-row-actions">
                    <button
                      className={`doc-ai-toggle ${forAI.has(doc.id) ? 'active' : ''}`}
                      onClick={() => toggleAI(doc.id)}
                      title={forAI.has(doc.id) ? 'Remover da IA' : 'Usar com IA'}
                    >
                      <Bot size={14} />
                      {forAI.has(doc.id) ? 'Selecionado para IA' : 'Usar com IA'}
                    </button>
                    <button className="doc-view-btn" title="Baixar" onClick={() => documentosService.download(doc.id, doc.nomeArquivo)}>
                      <Download size={15} />
                    </button>
                    <button className="doc-remove-btn" onClick={() => remover.mutate(doc.id)} title="Remover" disabled={remover.isPending}>
                      <X size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* ── Painel IA ── */}
        <aside className="doc-ai-panel">
          <div className="doc-ai-panel-header">
            <Sparkles size={16} style={{ color: 'var(--c-primary)' }} />
            <p className="section-label" style={{ margin: 0 }}>DOCUMENTOS PARA IA</p>
          </div>

          {docsParaIA.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
              Selecione documentos para incluir na análise da IA.
            </p>
          ) : (
            <>
              <div className="doc-ai-list">
                {docsParaIA.map((doc) => (
                  <div key={doc.id} className="doc-ai-item">
                    <FileText size={13} style={{ color: 'var(--c-primary)', flexShrink: 0 }} />
                    <span>{doc.nomeArquivo}</span>
                    <button onClick={() => toggleAI(doc.id)}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>

              <Button
                style={{ width: '100%', marginTop: 12 }}
                onClick={() => analisar.mutate(docsParaIA.map((d) => d.id))}
                disabled={analisar.isPending}
              >
                <Sparkles size={14} /> {analisar.isPending ? 'Analisando...' : 'Analisar com IA'}
              </Button>
            </>
          )}

          {aiSummary && (
            <div className="doc-ai-summary">
              <p className="section-label" style={{ marginBottom: 8 }}>ANÁLISE</p>
              <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{aiSummary}</p>
              <button
                style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--muted)', cursor: 'pointer', marginTop: 8 }}
                onClick={() => setAiSummary(null)}
              >
                Limpar
              </button>
            </div>
          )}

          {docsParaIA.length > 0 && (
            <Button
              variant="secondary"
              style={{ width: '100%', marginTop: 8 }}
              onClick={() => navigate(`/cases/${id}/pecas`)}
            >
              <Sparkles size={14} /> Gerar peça com estes docs
            </Button>
          )}
        </aside>
      </div>
    </div>
  )
}
