import {
  AlertCircle,
  ArrowRight,
  CalendarCheck,
  Clock,
  FileText,
  Play,
  Scale,
  Sparkles,
  User,
  Users,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { casesService } from '@/services/cases.service'
import { deadlinesService } from '@/services/deadlines.service'
import { etapasService } from '@/services/etapas.service'
import { useAuthStore } from '@/store/authStore'
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

function prazoLabel(dateStr: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0)
  const diff = Math.floor((d.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return 'Atrasado'
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Amanhã'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

const ROW_ICONS = [
  { Icon: FileText, bg: '#e8f0ff', color: '#4d9bff' },
  { Icon: User, bg: '#ede8ff', color: '#7c5cfc' },
  { Icon: Scale, bg: '#e8f9f0', color: '#4dba7c' },
  { Icon: FileText, bg: '#fff3e8', color: '#e07b2f' },
]

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

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

  const proximas = sorted.slice(1, 4)

  const criticos = pending.filter((d) => d.priority === 'critical').length
  const aguardando = cases.filter(
    (c) => c.status === 'aguardando_documentos' || c.status === 'aguardando_prazo',
  ).length
  const tempoMin = pending.length * 20
  const tempoStr =
    tempoMin >= 60
      ? `${Math.floor(tempoMin / 60)}h${tempoMin % 60 > 0 ? String(tempoMin % 60).padStart(2, '0') : ''}`
      : `${tempoMin}min`

  const proximosPrazos = [...pending]
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 3)

  return (
    <div className="dashboard-page">
      <div className="dashboard-main">
        <div className="dashboard-hero">
          <h1>{saudacao}, {user?.name?.split(' ')[0]}.</h1>
          {execucao
            ? <p>Sua próxima execução está pronta.</p>
            : <p>Todos os prazos estão em dia. Bom trabalho!</p>
          }
        </div>

        {execucao && caso ? (
          <>
            <p className="section-label" style={{ marginBottom: 12 }}>PRÓXIMA EXECUÇÃO</p>

            <div className="exec-card">
              <div className="exec-card-top">
                <div className="exec-icon-wrap">
                  <FileText size={22} />
                </div>
                <div className="exec-card-info">
                  <p className="exec-case-name">{caso.clientName}{caso.caseNumber ? ` × ${caso.caseNumber}` : ''}</p>
                  <h3 className="exec-title">{execucao.title}</h3>
                </div>
                <Button onClick={() => navigate(`/cases/${caso.id}`)}>
                  <Play size={13} fill="currentColor" />
                  Continuar
                </Button>
                <button className="exec-arrow-btn" onClick={() => navigate(`/cases/${caso.id}`)}>
                  <ArrowRight size={17} />
                </button>
              </div>

              <div className="exec-info-row">
                <span>
                  <CalendarCheck size={14} />
                  {prazoLabel(execucao.dueDate)}
                </span>
                <span>
                  <Clock size={14} />
                  {execucao.businessDaysLeft} dia{execucao.businessDaysLeft !== 1 ? 's' : ''} útil{execucao.businessDaysLeft !== 1 ? 'is' : ''}
                </span>
                {execucao.responsavel && (
                  <span>
                    <User size={14} />
                    {execucao.responsavel}
                  </span>
                )}
              </div>

              {etapas.length > 0 && (
                <div className="exec-stepper">
                  {etapas.map((et, i) => (
                    <div key={et.id} className={`exec-step ${et.concluida || i === etapas.findIndex(e => !e.concluida) ? (et.concluida ? 'done' : 'active') : ''}`}>
                      <div className="exec-step-track">
                        <div className="exec-step-dot" />
                        {i < etapas.length - 1 && <div className="exec-step-line" />}
                      </div>
                      <span>{et.titulo}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {proximas.length > 0 && (
              <>
                <p className="section-label" style={{ margin: '28px 0 12px' }}>PRÓXIMAS EXECUÇÕES</p>
                <div className="exec-list-panel">
                  {proximas.map((d, i) => {
                    const c = cases.find((x) => x.id === d.caseId)
                    const { Icon, bg, color } = ROW_ICONS[i % ROW_ICONS.length]
                    return (
                      <Link
                        key={d.id}
                        to={`/cases/${d.caseId}`}
                        className="exec-list-row"
                        style={{ borderTop: i > 0 ? '1px solid var(--line)' : 'none' }}
                      >
                        <span className="exec-row-icon" style={{ background: bg, color }}>
                          <Icon size={18} />
                        </span>
                        <div className="exec-list-info">
                          <strong>{d.title}</strong>
                          <span>{c?.clientName ?? '—'}</span>
                        </div>
                        <div className="exec-list-right">
                          <time>{prazoLabel(d.dueDate)}</time>
                          <span>{d.businessDaysLeft}d úteis</span>
                        </div>
                        <ArrowRight size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                      </Link>
                    )
                  })}
                </div>

                <Link to="/trabalho" className="ver-todas-link">
                  Ver todas as execuções ({pending.length})
                  <ArrowRight size={14} />
                </Link>
              </>
            )}
          </>
        ) : (
          <div className="panel" style={{ textAlign: 'center', padding: 48 }}>
            <Sparkles size={32} style={{ color: 'var(--c-primary)', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--muted)' }}>Nenhum prazo pendente. Adicione casos para começar.</p>
            <div style={{ marginTop: 16 }}>
              <Link to="/cases/new"><Button>Novo caso</Button></Link>
            </div>
          </div>
        )}
      </div>

      <div className="dashboard-aside">
        <div className="panel">
          <p className="section-label" style={{ marginBottom: 18 }}>RESUMO DE HOJE</p>
          <div className="resumo-list">
            <div className="resumo-item">
              <span className="resumo-icon" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                <AlertCircle size={16} />
              </span>
              <div>
                <strong>{criticos}</strong>
                <span>prazos críticos</span>
              </div>
            </div>
            <div className="resumo-item">
              <span className="resumo-icon" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
                <CalendarCheck size={16} />
              </span>
              <div>
                <strong>{pending.length}</strong>
                <span>execuções</span>
              </div>
            </div>
            <div className="resumo-item">
              <span className="resumo-icon" style={{ background: '#ede8ff', color: '#7c5cfc' }}>
                <Users size={16} />
              </span>
              <div>
                <strong>{aguardando}</strong>
                <span>aguardando terceiros</span>
              </div>
            </div>
            <div className="resumo-item">
              <span className="resumo-icon" style={{ background: 'var(--accent-soft)', color: 'var(--c-primary)' }}>
                <Clock size={16} />
              </span>
              <div>
                <strong>{tempoStr}</strong>
                <span>tempo planejado</span>
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-title" style={{ marginBottom: 16 }}>
            <p className="section-label" style={{ margin: 0 }}>PRÓXIMOS PRAZOS</p>
            <Link to="/agenda" style={{ fontSize: 13, color: 'var(--c-primary)', fontWeight: 600 }}>Ver todos</Link>
          </div>
          {proximosPrazos.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>Nenhum prazo pendente.</p>
          ) : (
            <div className="timeline-prazos">
              {proximosPrazos.map((d, i) => {
                const c = cases.find((x) => x.id === d.caseId)
                const label = prazoLabel(d.dueDate)
                const isToday = label === 'Hoje'
                const isLast = i === proximosPrazos.length - 1
                return (
                  <Link key={d.id} to={`/cases/${d.caseId}`} className="timeline-prazo-item">
                    <div className="timeline-prazo-left">
                      <span className={`timeline-dot ${isToday ? 'today' : ''}`} />
                      {!isLast && <span className="timeline-line" />}
                    </div>
                    <div className="timeline-prazo-body">
                      <span className={`timeline-date ${isToday ? 'today' : ''}`}>{label}</span>
                      <strong>{d.title}</strong>
                      <span className="timeline-case">{c?.clientName ?? '—'}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        <div className="tip-card">
          <Sparkles size={16} style={{ color: 'var(--c-primary)', flexShrink: 0 }} />
          <p><strong>Foco gera resultado.</strong><br />A Orbian cuida do resto.</p>
        </div>
      </div>
    </div>
  )
}
