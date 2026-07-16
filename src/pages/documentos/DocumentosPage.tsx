import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Bot, CheckCircle2, Download, FileText, Plus, Sparkles, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { casesService } from '@/services/cases.service'
import { documentosService, type Documento } from '@/services/documentos.service'
import { formatDate } from '@/lib/utils'

const CATEGORIAS = ['Todos', 'Procuração', 'Contratos', 'Petições', 'Decisões', 'Sentenças', 'Recursos', 'Outros'] as const
type Categoria = (typeof CATEGORIAS)[number]

const PIPELINE_LABELS = ['Cadastro', 'Documentos', 'Gerar Peças', 'Prazos', 'Revisão', 'Encerramento']

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
  const [contexto, setContexto] = useState('')

  const { data: legalCase } = useQuery({
    queryKey: ['case', id],
    queryFn: () => casesService.get(id!),
    enabled: !!id,
  })

  useEffect(() => {
    if (legalCase?.resumoFatos) setContexto(legalCase.resumoFatos)
  }, [legalCase?.resumoFatos])

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

  const salvarContexto = useMutation({
    mutationFn: () => casesService.update(id!, { resumoFatos: contexto }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['case', id] }),
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

  return (
    <div className="doc-page">
      <header className="new-case-header">
        <button className="back-btn" onClick={() => navigate(`/cases/${id}`)}>
          <ArrowLeft size={16} /> Voltar ao caso
        </button>
        <nav className="pipeline-tabs">
          {PIPELINE_LABELS.map((label, i) => (
            <span key={label} className={`pipeline-tab ${i < 1 ? 'done' : i === 1 ? 'active' : 'locked'}`}>
              {i < 1 ? <CheckCircle2 size={13} /> : <span className="pipeline-tab-dot">{i + 1}</span>}
              {label}
            </span>
          ))}
        </nav>
        <Button onClick={() => navigate(`/cases/${id}/pecas`)}>
          Continuar para Gerar Peças <ArrowRight size={15} />
        </Button>
      </header>

      <div className="doc-page-body">
        <div className="doc-page-main">
          <div>
            <h1>Documentos</h1>
            <p className="new-case-card-sub" style={{ paddingBottom: 0, border: 'none' }}>
              Organize todas as informações necessárias para a execução jurídica.
            </p>
          </div>

          <section className="new-case-card">
            <p className="section-label-lg" style={{ fontSize: 15 }}>Contexto da Execução</p>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 10 }}>
              Descreva os fatos relevantes, acontecimentos principais e objetivo da próxima peça.
            </p>
            <textarea
              rows={3}
              value={contexto}
              onChange={(e) => setContexto(e.target.value)}
              onBlur={() => contexto !== (legalCase?.resumoFatos ?? '') && salvarContexto.mutate()}
              placeholder="Descreva o que aconteceu neste caso, os pontos importantes e o objetivo jurídico desta execução..."
            />
          </section>

          {erro && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{erro}</p>}

          <section className="new-case-card doc-list-card">
            <div className="ws-section-header">
              <div>
                <p className="section-label-lg" style={{ fontSize: 15 }}>Documentos do Caso</p>
                <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>Gerencie os arquivos que servirão de base para a inteligência artificial.</p>
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
                  <Upload size={15} /> {upload.isPending ? 'Enviando...' : 'Adicionar Documento'}
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

            <div className="doc-tabs">
              {CATEGORIAS.map((cat) => (
                <button
                  key={cat}
                  className={categoriaAtiva === cat ? 'active' : ''}
                  onClick={() => setCategoriaAtiva(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="empty-state" style={{ minHeight: 160 }}>
                <FileText size={32} style={{ opacity: 0.3 }} />
                <p>Carregando documentos...</p>
              </div>
            ) : displayedDocs.length === 0 ? (
              <div className="empty-state" style={{ minHeight: 160 }}>
                <FileText size={32} style={{ opacity: 0.3 }} />
                <p>{categoriaAtiva === 'Todos' ? 'Nenhum documento adicionado.' : `Nenhum documento em ${categoriaAtiva}.`}</p>
                <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                  <Plus size={14} /> Adicionar
                </Button>
              </div>
            ) : (
              <div className="doc-table">
                <div className="doc-table-head">
                  <span>Nome</span>
                  <span>Categoria</span>
                  <span>Data</span>
                  <span>Tamanho</span>
                  <span />
                </div>
                {displayedDocs.map((doc: Documento) => (
                  <div key={doc.id} className={`doc-table-row ${forAI.has(doc.id) ? 'for-ai' : ''}`}>
                    <span className="doc-table-name"><FileText size={15} /> {doc.nomeArquivo}</span>
                    <span><span className="doc-cat-chip">{doc.tipo ?? 'Outros'}</span></span>
                    <span className="muted">{formatDate(doc.createdAt)}</span>
                    <span className="muted">{formatSize(doc.tamanhoBytes)}</span>
                    <span className="doc-table-actions">
                      <button
                        className={`doc-ai-toggle ${forAI.has(doc.id) ? 'active' : ''}`}
                        onClick={() => toggleAI(doc.id)}
                        title={forAI.has(doc.id) ? 'Remover da IA' : 'Usar com IA'}
                      >
                        <Bot size={13} />
                      </button>
                      <button className="doc-view-btn" title="Baixar" onClick={() => documentosService.download(doc.id, doc.nomeArquivo)}>
                        <Download size={14} />
                      </button>
                      <button className="doc-remove-btn" onClick={() => remover.mutate(doc.id)} title="Remover" disabled={remover.isPending}>
                        <X size={14} />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── Painel IA ── */}
        <aside className="new-case-card new-case-insights doc-ai-panel">
          <div className="doc-ai-panel-header">
            <Sparkles size={16} style={{ color: 'var(--c-primary)' }} />
            <p className="section-label" style={{ margin: 0 }}>PREPARAÇÃO DA PEÇA</p>
          </div>

          {docsParaIA.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
              Selecione documentos na lista para incluir na análise da IA.
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
        </aside>
      </div>
    </div>
  )
}
