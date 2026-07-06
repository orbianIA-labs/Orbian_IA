import { useState } from 'react'
import { ArrowRight, CheckCircle2, Circle, FileText, Play, Sparkles, Zap } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { casesService } from '@/services/cases.service'
import { deadlinesService } from '@/services/deadlines.service'
import { etapasService } from '@/services/etapas.service'
import { useAuthStore } from '@/store/authStore'
import { formatDate } from '@/lib/utils'
import type { Deadline } from '@/types/domain.types'

function score(d: Deadline): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = new Date(d.dueDate); due.setHours(0, 0, 0, 0)
  const diff = Math.floor((due.getTime() - today.getTime()) / 86400000)
  let s = 10
  if (diff < 0) s += 150
  else if (diff === 0) s += 100
  else if (diff === 1) s += 70
  if (d.priority === 'critical') s += 40
  else if (d.priority === 'attention') s += 20
  return s
}

export function TrabalhoPage() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [instrucoes, setInstrucoes] = useState('')

  const { data: cases = [] } = useQuery({ queryKey: ['cases'], queryFn: () => casesService.list() })
  const { data: deadlines = [] } = useQuery({ queryKey: ['deadlines'], queryFn: deadlinesService.list })

  const pending = deadlines.filter((d) => !d.completed)
  const sorted = [...pending].sort((a, b) => score(b) - score(a))
  const execucao = sorted[0]
  const caso = execucao ? cases.find((c) => c.id === execucao.caseId) : null

  const { data: etapas = [] } = useQuery({
    queryKey: ['etapas', caso?.id],
    queryFn: () => etapasService.list(caso!.id),
    enabled: !!caso?.id,
  })

  const toggleEtapa = useMutation({
    mutationFn: ({ id, concluida }: { id: string; concluida: boolean }) =>
      etapasService.update(id, { concluida }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['etapas', caso?.id] }),
  })

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  if (!execucao || !caso) {
    return (
      <div className="page-stack">
        <div className="empty-workspace">
          <Zap size={40} style={{ color: 'var(--c-primary)', opacity: 0.5 }} />
          <h2>Nenhuma execução pendente</h2>
          <p>Todos os prazos estão em dia. Bom trabalho!</p>
          <Link to="/cases/new">
            <Button>Novo caso</Button>
          </Link>
        </div>
      </div>
    )
  }

  const proximasOutrasCases = sorted.slice(1, 5)
  const docRecomendados = caso.recommendedDocuments ?? []

  return (
    <div className="page-stack">
      <div className="trabalho-hero">
        <div>
          <p className="eyebrow">{saudacao}, {user?.name?.split(' ')[0]}.</p>
          <h1>Sua próxima execução está pronta.</h1>
        </div>
      </div>

      <div className="trabalho-grid">
        <div className="trabalho-main">

          {/* ── Card de execução atual ── */}
          <div className="exec-card-full">
            <div className="exec-card-header">
              <div className="exec-icon">
                <Play size={22} fill="currentColor" />
              </div>
              <div className="exec-card-meta">
                <p className="exec-label">PRÓXIMA EXECUÇÃO</p>
                <h2>{execucao.title}</h2>
                <p className="exec-case">{caso.clientName}{caso.caseNumber ? ` · ${caso.caseNumber}` : ''}</p>
              </div>
              <Button onClick={() => navigate(`/cases/${caso.id}`)} style={{ marginLeft: 'auto' }}>
                Continuar no caso
              </Button>
            </div>

            <div className="exec-deadline-info">
              <span className={`badge ${execucao.priority === 'critical' ? 'badge-critical' : execucao.priority === 'attention' ? 'badge-attention' : 'badge-normal'}`}>
                {execucao.priority === 'critical' ? 'Urgente' : execucao.priority === 'attention' ? 'Atenção' : 'Normal'}
              </span>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>
                Vence em {formatDate(execucao.dueDate)} · {execucao.businessDaysLeft} dias úteis
              </span>
              {execucao.responsavel && (
                <span style={{ color: 'var(--muted)', fontSize: 13 }}>· {execucao.responsavel}</span>
              )}
            </div>

            {/* ── Documentos necessários ── */}
            {docRecomendados.length > 0 && (
              <div className="exec-docs-section">
                <p className="section-label" style={{ marginBottom: 10 }}>DOCUMENTOS</p>
                <div className="exec-docs-list">
                  {docRecomendados.map((doc, i) => (
                    <div key={i} className={`exec-doc-row ${doc.received ? 'received' : ''}`}>
                      <span className="exec-doc-check">
                        {doc.received
                          ? <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                          : <Circle size={16} style={{ color: 'var(--muted)' }} />}
                      </span>
                      <span className="exec-doc-name">
                        <FileText size={13} />
                        {doc.name}
                      </span>
                      <button className="exec-doc-visualizar">Visualizar</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Instruções adicionais ── */}
            <div className="exec-instrucoes-section">
              <p className="section-label" style={{ marginBottom: 8 }}>INSTRUÇÕES ADICIONAIS</p>
              <textarea
                className="obs-textarea"
                placeholder="Ex.: mencionar garantia vencida, incluir pedido de danos morais..."
                rows={3}
                value={instrucoes}
                onChange={(e) => setInstrucoes(e.target.value)}
              />
            </div>

            {/* ── Gerar peça com IA ── */}
            <Button
              style={{ width: '100%', background: 'var(--grad-primary)', justifyContent: 'center', gap: 8 }}
              onClick={() => navigate(`/cases/${caso.id}/pecas`)}
            >
              <Sparkles size={16} /> Gerar peça com IA
            </Button>

            {/* ── Checklist de etapas ── */}
            {etapas.length > 0 && (
              <div className="etapas-checklist" style={{ marginTop: 20 }}>
                <p className="section-label" style={{ marginBottom: 8 }}>ETAPAS DA EXECUÇÃO</p>
                {etapas.map((et) => (
                  <button
                    key={et.id}
                    className={`etapa-item ${et.concluida ? 'etapa-done' : ''}`}
                    onClick={() => toggleEtapa.mutate({ id: et.id, concluida: !et.concluida })}
                  >
                    {et.concluida
                      ? <CheckCircle2 size={18} style={{ color: 'var(--success)', flexShrink: 0 }} />
                      : <Circle size={18} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                    }
                    <span>{et.titulo}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Próximas execuções ── */}
          {proximasOutrasCases.length > 0 && (
            <div className="panel">
              <div className="panel-title">
                <h2>Próximas execuções</h2>
                <Link to="/deadlines">Ver todas</Link>
              </div>
              <div className="list">
                {proximasOutrasCases.map((d) => {
                  const c = cases.find((x) => x.id === d.caseId)
                  return (
                    <Link className="list-row action-row" key={d.id} to={`/cases/${d.caseId}`}>
                      <div>
                        <strong>{d.title}</strong>
                        <span>{c?.clientName ?? '—'}</span>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <time style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>
                          {formatDate(d.dueDate)}
                        </time>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{d.businessDaysLeft}d úteis</span>
                      </div>
                      <ArrowRight size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Aside ── */}
        <div className="trabalho-aside">
          <div className="panel">
            <p className="section-label">CASO</p>
            <dl className="definition-list" style={{ gap: 12 }}>
              <div><dt>Status</dt><dd>{caso.status.replace(/_/g, ' ')}</dd></div>
              <div><dt>Cliente</dt><dd>{caso.clientName}</dd></div>
              {caso.tribunal && <div><dt>Tribunal</dt><dd>{caso.tribunal}</dd></div>}
              <div><dt>Área</dt><dd>{caso.area}</dd></div>
            </dl>
            <div style={{ marginTop: 16 }}>
              <Link to={`/cases/${caso.id}`}>
                <Button variant="secondary" style={{ width: '100%' }}>
                  Ver caso completo <ArrowRight size={15} />
                </Button>
              </Link>
            </div>
          </div>

          <div className="panel">
            <p className="section-label">RESUMO DO DIA</p>
            <div className="metric-mini-list">
              <div className="metric-mini">
                <strong style={{ color: 'var(--danger)' }}>{pending.filter((d) => d.priority === 'critical').length}</strong>
                <span>prazos críticos</span>
              </div>
              <div className="metric-mini">
                <strong>{pending.length}</strong>
                <span>execuções pendentes</span>
              </div>
              <div className="metric-mini">
                <strong>{cases.filter((c) => c.status === 'aguardando_documentos' || c.status === 'aguardando_prazo').length}</strong>
                <span>aguardando terceiros</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
