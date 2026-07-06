import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Flame,
  Folder,
  Gauge,
  MoreVertical,
  Play,
  Scale,
  Sparkles,
  Target,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { casesService } from '@/services/cases.service'
import { deadlinesService } from '@/services/deadlines.service'
import { etapasService } from '@/services/etapas.service'
import { useAuthStore } from '@/store/authStore'
import type { CaseStatus, Deadline, EtapaPipeline } from '@/types/domain.types'

const ETAPA_LABEL: Record<EtapaPipeline, string> = {
  cadastro: 'Cadastro',
  documentos: 'Documentos',
  pecas: 'Peças',
  revisao: 'Revisão',
  protocolo: 'Protocolo',
  atualizacoes: 'Atualizações',
  encerramento: 'Encerramento',
}

const STATUS_TAG: Record<CaseStatus, { label: string; cls: string }> = {
  em_andamento: { label: 'Ativo', cls: 'tag-active' },
  aguardando_documentos: { label: 'Aguardando', cls: 'tag-wait' },
  aguardando_prazo: { label: 'Aguardando', cls: 'tag-wait' },
  finalizado: { label: 'Concluído', cls: 'tag-done' },
  arquivado: { label: 'Arquivado', cls: 'tag-muted' },
}

const PRIORITY_TAG: Record<Deadline['priority'], { label: string; cls: string }> = {
  critical: { label: 'ALTA', cls: 'prio-alta' },
  attention: { label: 'MÉDIA', cls: 'prio-media' },
  normal: { label: 'BAIXA', cls: 'prio-baixa' },
}

const ROW_ICONS = [
  { Icon: FileText, bg: '#e8f0ff', color: '#2565ea' },
  { Icon: Scale, bg: '#ede8ff', color: '#7c5cfc' },
  { Icon: FileText, bg: '#e8f9f0', color: '#2ba36a' },
  { Icon: Scale, bg: '#fff3e8', color: '#e2622c' },
]

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

/** Rótulo curto do dia: Hoje / Amanhã / 12 out */
function dayLabel(dateStr: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0)
  const diff = Math.floor((d.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return 'Atrasado'
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Amanhã'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

/** "Hoje, 17:00" quando há horário; senão só o dia */
function listDeadline(dateStr: string) {
  const d = new Date(dateStr)
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0
  const day = dayLabel(dateStr)
  if (!hasTime || day === 'Atrasado') return day
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${day}, ${time}`
}

/** Destaque da missão: "2h41 restante" no mesmo dia, senão o rótulo do dia */
function missionDeadline(dateStr: string) {
  const now = new Date()
  const due = new Date(dateStr)
  const sameDay = now.toDateString() === due.toDateString()
  if (sameDay) {
    const ms = due.getTime() - now.getTime()
    if (ms > 0) {
      const totalMin = Math.floor(ms / 60000)
      const h = Math.floor(totalMin / 60)
      const m = totalMin % 60
      if (h > 0) return `${h}h${m > 0 ? String(m).padStart(2, '0') : ''} restante`
      return `${m} min restante`
    }
    return 'Hoje'
  }
  return dayLabel(dateStr)
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  const { data: cases = [] } = useQuery({ queryKey: ['cases'], queryFn: () => casesService.list() })
  const { data: deadlines = [] } = useQuery({ queryKey: ['deadlines'], queryFn: deadlinesService.list })

  const pending = deadlines.filter((d) => !d.completed)
  const concluidas = deadlines.filter((d) => d.completed).length
  const total = deadlines.length
  const pct = total > 0 ? Math.round((concluidas / total) * 100) : 0

  const sorted = [...pending].sort((a, b) => score(b) - score(a))
  const execucao = sorted[0]
  const caso = execucao ? cases.find((c) => c.id === execucao.caseId) : null

  const { data: etapas = [] } = useQuery({
    queryKey: ['etapas', caso?.id],
    queryFn: () => etapasService.list(caso!.id),
    enabled: !!caso?.id,
  })

  const proximas = sorted.slice(1, 4)

  // Progresso da missão a partir das etapas
  const etapasDone = etapas.filter((e) => e.concluida).length
  const activeIdx = etapas.findIndex((e) => !e.concluida)
  const progressoStr = etapas.length > 0 ? `${etapasDone} de ${etapas.length}` : `${caso?.progress ?? 0}%`
  const restantes = etapas.length > 0 ? etapas.length - etapasDone : 0
  const tempoEst = etapas.length > 0 ? `${8 + restantes * 6} min` : '—'

  // Estatísticas do painel de IA
  const docsRecebidos = caso?.recommendedDocuments.filter((d) => d.received).length ?? 0
  const docsPendentes = caso?.recommendedDocuments.filter((d) => !d.received).length ?? 0

  return (
    <div className="home">
      {/* ── Cabeçalho: saudação + progresso ── */}
      <header className="home-header">
        <div>
          <h1>{saudacao}, {user?.name?.split(' ')[0] ?? ''}</h1>
          <p>
            Hoje você possui <strong>{total} execuç{total === 1 ? 'ão' : 'ões'}</strong>.{' '}
            {concluidas} já {concluidas === 1 ? 'foi concluída' : 'foram concluídas'}.
          </p>
        </div>
        <div className="home-progress">
          <div className="home-progress-labels">
            <span>{pct}% CONCLUÍDO</span>
            <span className="muted">META: 100%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </header>

      {execucao && caso ? (
        <>
          {/* ── MISSÃO DO MOMENTO ── */}
          <section className="mission-card">
            <div className="mission-main">
              <div className="mission-top">
                <span className="mission-pill">
                  <Flame size={13} /> MISSÃO DO MOMENTO
                </span>
                <span className="mission-id">ID: #EXEC-{caso.id.slice(0, 4).toUpperCase()}</span>
              </div>

              <h2 className="mission-title">{execucao.title}</h2>
              <p className="mission-sub">{caso.title || caso.clientName}</p>

              <div className="mission-metrics">
                <div className="mission-metric">
                  <span className="metric-label"><Clock size={12} /> DEADLINE</span>
                  <strong className="metric-danger">{missionDeadline(execucao.dueDate)}</strong>
                </div>
                <div className="mission-metric">
                  <span className="metric-label"><Gauge size={12} /> TEMPO EST.</span>
                  <strong>{tempoEst}</strong>
                </div>
                <div className="mission-metric">
                  <span className="metric-label"><Target size={12} /> PROGRESSO</span>
                  <strong>{progressoStr}</strong>
                </div>
              </div>

              <button className="mission-cta" onClick={() => navigate(`/cases/${caso.id}`)}>
                <Play size={15} fill="currentColor" />
                Continuar Execução
              </button>
            </div>

            {/* Dependency checklist */}
            <aside className="mission-checklist">
              <p className="checklist-title">DEPENDENCY CHECKLIST</p>
              {etapas.length > 0 ? (
                <ul>
                  {etapas.map((et, i) => {
                    const state = et.concluida ? 'done' : i === activeIdx ? 'active' : 'pending'
                    return (
                      <li key={et.id} className={`check-item ${state}`}>
                        {state === 'done' ? (
                          <CheckCircle2 size={16} className="check-icon" />
                        ) : state === 'active' ? (
                          <span className="check-radio" />
                        ) : (
                          <Circle size={16} className="check-icon" />
                        )}
                        <span>{et.titulo}</span>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <ul>
                  {caso.recommendedDocuments.slice(0, 6).map((doc, i) => (
                    <li key={i} className={`check-item ${doc.received ? 'done' : 'pending'}`}>
                      {doc.received ? (
                        <CheckCircle2 size={16} className="check-icon" />
                      ) : (
                        <Circle size={16} className="check-icon" />
                      )}
                      <span>{doc.name}</span>
                    </li>
                  ))}
                  {caso.recommendedDocuments.length === 0 && (
                    <li className="check-item pending"><Circle size={16} className="check-icon" /><span>Sem etapas cadastradas</span></li>
                  )}
                </ul>
              )}
            </aside>
          </section>

          {/* ── Banda inferior: próximas execuções + painel IA ── */}
          <div className="home-lower">
            <div className="home-lower-main">
              <div className="section-head">
                <h3 className="section-title">Próximas Execuções</h3>
                <Link to="/trabalho" className="section-link">Ver todas</Link>
              </div>

              {proximas.length > 0 ? (
                <div className="next-list">
                  {proximas.map((d, i) => {
                    const c = cases.find((x) => x.id === d.caseId)
                    const { Icon, bg, color } = ROW_ICONS[i % ROW_ICONS.length]
                    const prio = PRIORITY_TAG[d.priority]
                    return (
                      <Link key={d.id} to={`/cases/${d.caseId}`} className="next-row">
                        <span className="next-icon" style={{ background: bg, color }}>
                          <Icon size={18} />
                        </span>
                        <div className="next-info">
                          <strong>{d.title}</strong>
                          <span>{c?.clientName ?? c?.title ?? '—'}</span>
                        </div>
                        <div className="next-deadline">
                          <span className="next-deadline-label">DEADLINE</span>
                          <time>{listDeadline(d.dueDate)}</time>
                        </div>
                        <span className={`prio-badge ${prio.cls}`}>{prio.label}</span>
                        <MoreVertical size={16} className="next-more" />
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="panel-empty">Nenhuma outra execução na fila.</div>
              )}
            </div>

            {/* Painel IA Assistente */}
            <aside className="ia-panel">
              <div className="ia-panel-head">
                <span className="ia-panel-icon"><Sparkles size={16} /></span>
                <strong>IA Assistente</strong>
              </div>
              <div className="ia-stats">
                <div className="ia-stat">
                  <span>Docs analisados</span>
                  <strong>{docsRecebidos}</strong>
                </div>
                <div className="ia-stat">
                  <span>Documentos pendentes</span>
                  <strong>{docsPendentes}</strong>
                </div>
              </div>
              <p className="ia-ready">
                <span className="ia-ready-dot" />
                {docsPendentes === 0 ? 'PRONTA PARA GERAR A PEÇA.' : 'AGUARDANDO DOCUMENTOS.'}
              </p>
              <button className="ia-cta" onClick={() => navigate(`/cases/${caso.id}/pecas`)}>
                Consultar IA
              </button>
            </aside>
          </div>
        </>
      ) : (
        <div className="panel mission-empty">
          <Sparkles size={30} style={{ color: 'var(--c-primary)' }} />
          <p>Nenhuma execução pendente. Tudo em dia por aqui.</p>
          <button className="mission-cta" onClick={() => navigate('/cases/new')}>
            <Play size={15} fill="currentColor" /> Nova Execução
          </button>
        </div>
      )}

      {/* ── Casos Recentes ── */}
      {cases.length > 0 && (
        <section className="recent-section">
          <div className="section-head">
            <h3 className="section-title">Casos Recentes</h3>
            {cases.length > 4 && <Link to="/cases" className="section-link">Ver todos</Link>}
          </div>
          <div className="recent-grid">
            {cases.slice(0, 4).map((c, i) => {
              const tag = STATUS_TAG[c.status]
              return (
                <Link key={c.id} to={`/cases/${c.id}`} className="recent-card">
                  <div className="recent-card-top">
                    <span className="recent-folder"><Folder size={16} /></span>
                    <span className="recent-num">{c.caseNumber ?? `#${String(i + 1).padStart(4, '0')}`}</span>
                  </div>
                  <strong className="recent-title">{c.title || c.clientName}</strong>
                  <span className="recent-fase">Fase: {ETAPA_LABEL[c.etapaAtual]}</span>
                  <div className="recent-card-foot">
                    <span className={`recent-status ${tag.cls}`}>{tag.label.toUpperCase()}</span>
                    <span className="recent-open">Abrir <ArrowRight size={13} /></span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
