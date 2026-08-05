import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Download, FileText, Plus, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { casesService } from '@/services/cases.service'
import { documentosService, type Documento } from '@/services/documentos.service'
import api from '@/lib/axios'
import { formatDate } from '@/lib/utils'
import { PIPELINE, reachableIndex, stageRoute } from '@/lib/pipeline'
import { PipelineStepper } from '@/components/case/PipelineStepper'

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
  const [erro, setErro] = useState<string | null>(null)
  const [contexto, setContexto] = useState('')
  const [dragOver, setDragOver] = useState(false)

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

  const { data: pecas = [] } = useQuery<{ id: string }[]>({
    queryKey: ['pecas', id],
    queryFn: () => api.get(`/api/casos/${id}/pecas`).then((r) => r.data),
    enabled: !!id,
  })
  const currentIdx = reachableIndex(legalCase, pecas.length > 0)
  const stageIdx = PIPELINE.findIndex((s) => s.key === 'documentos')

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

  const salvarContexto = useMutation({
    mutationFn: () => casesService.update(id!, { resumoFatos: contexto }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['case', id] }),
  })

  function handleFiles(files: File[]) {
    if (files.length) upload.mutate(files)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleFiles(Array.from(e.target.files ?? []))
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent<HTMLElement>) {
    e.preventDefault()
    setDragOver(false)
    handleFiles(Array.from(e.dataTransfer.files ?? []))
  }

  const displayedDocs = categoriaAtiva === 'Todos'
    ? docs
    : docs.filter((d) => d.tipo === categoriaAtiva)

  return (
    <div className="doc-page">
      <header className="new-case-header">
        <button className="back-btn" onClick={() => navigate(`/cases/${id}`)}>
          <ArrowLeft size={16} /> Voltar ao caso
        </button>
        <div style={{ flex: 1 }} />
        <Button onClick={() => navigate(`/cases/${id}/pecas`)}>
          Continuar para Gerar Peças <ArrowRight size={15} />
        </Button>
      </header>

      <PipelineStepper
        label="Documentos"
        subtitle="Anexe os documentos que embasam a peça."
        viewedIdx={stageIdx}
        currentPipelineIdx={currentIdx}
        progressoPct={Math.round((currentIdx / (PIPELINE.length - 1)) * 100)}
        podeVoltar={stageIdx > 0}
        podeAvancarView={stageIdx < currentIdx}
        onIrParaIdx={(idx) => navigate(stageRoute(id!, PIPELINE[idx].key))}
        onIrParaEtapa={(key) => navigate(stageRoute(id!, key))}
      />

      <div className="doc-page-body">
        <div className="doc-page-main">
          <div>
            <h1>Documentos</h1>
            <p className="new-case-card-sub" style={{ paddingBottom: 0, border: 'none' }}>
              Organize todas as informações necessárias para a execução jurídica.
            </p>
          </div>

          {erro && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{erro}</p>}

          <div className="doc-page-row">
          <section className="new-case-card doc-context-card">
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

          <section
            className={`new-case-card doc-list-card ${dragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
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
                  <div key={doc.id} className="doc-table-row">
                    <span className="doc-table-name"><FileText size={15} /> {doc.nomeArquivo}</span>
                    <span><span className="doc-cat-chip">{doc.tipo ?? 'Outros'}</span></span>
                    <span className="muted">{formatDate(doc.createdAt)}</span>
                    <span className="muted">{formatSize(doc.tamanhoBytes)}</span>
                    <span className="doc-table-actions">
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
        </div>
      </div>
    </div>
  )
}
