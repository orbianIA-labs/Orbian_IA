import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Folder,
  FolderKanban,
  MoreVertical,
  Play,
  Scale,
  Sparkles,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { casesService } from '@/services/cases.service'
import { deadlinesService } from '@/services/deadlines.service'
import { useAuthStore } from '@/store/authStore'
import type { CaseStatus, Deadline, EtapaPipeline } from '@/types/domain.types'

const ETAPA_LABEL: Record<EtapaPipeline, string> = {
  cadastro: 'Cadastro',
  documentos: 'Documentos',
  pecas: 'Gerar Peças',
  prazos: 'Prazos',
  revisao: 'Revisão',
  protocolo: 'Protocolo',
  atualizacoes: 'Atualizações',
  encerramento: 'Finalização',
}

const MISSION_PIPELINE: { key: EtapaPipeline; label: string }[] = [
  { key: 'cadastro', label: 'Cadastro' },
  { key: 'documentos', label: 'Documentos' },
  { key: 'pecas', label: 'Peça' },
  { key: 'prazos', label: 'Prazo' },
  { key: 'revisao', label: 'Revisão' },
  { key: 'encerramento', label: 'Encerramento' },
]

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
  const proximas = sorted.slice(1, 4)

  // Estatísticas do painel de IA
  const docsRecebidos = caso?.recommendedDocuments.filter((d) => d.received).length ?? 0
  const docsPendentes = caso?.recommendedDocuments.filter((d) => !d.received).length ?? 0

  // Estatísticas reais para os tiles do Command Center
  const casosAtivos = cases.filter((c) => c.status !== 'arquivado' && c.status !== 'finalizado').length
  const casosConcluidos = cases.filter((c) => c.status === 'finalizado').length
  const prazosUrgentes = pending.filter((d) => d.priority === 'critical').length

  const missionStageIdx = caso ? Math.max(0, MISSION_PIPELINE.findIndex((s) => s.key === caso.etapaAtual)) : 0

  return (
    <div className="home">
      {/* ── Cabeçalho: saudação + progresso ── */}
      <header className="home-header">
        <div>
          <h1>{saudacao}, {user?.name?.split(' ')[0] ?? ''}.</h1>
          <p>
            Sua operação jurídica está <strong>{pct}% organizada</strong> hoje.{' '}
            {total} execuç{total === 1 ? 'ão' : 'ões'}, {concluidas} já {concluidas === 1 ? 'concluída' : 'concluídas'}.
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

      <div className="cc-body">
       <div className="cc-main">
        {execucao && caso ? (
          <>
            {/* ── EXECUÇÃO EM MOVIMENTO ── */}
            <section className="mission-card">
              <div className="mission-main">
                <div className="mission-top">
                  <span className="mission-pill">
                    <Sparkles size={13} /> EXECUÇÃO EM MOVIMENTO
                  </span>
                  <span className="mission-id">ID: #EXEC-{caso.id.slice(0, 4).toUpperCase()}</span>
                </div>

                <nav className="cc-stepper">
                  {MISSION_PIPELINE.map((stage, idx) => {
                    const done = idx < missionStageIdx
                    const active = idx === missionStageIdx
                    return (
                      <div key={stage.key} className={`cc-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
                        <span className="cc-step-dot">{done ? <CheckCircle2 size={16} /> : idx + 1}</span>
                        <span className="cc-step-label">{stage.label}</span>
                      </div>
                    )
                  })}
                </nav>

                <div className="mission-bottom">
                  <div>
                    <h2 className="mission-title">{caso.title || caso.clientName}</h2>
                    <p className="mission-sub">{caso.caseNumber ?? execucao.title} · {missionDeadline(execucao.dueDate)}</p>
                  </div>
                  <button className="mission-cta" onClick={() => navigate(`/cases/${caso.id}`)}>
                    <Play size={15} fill="currentColor" />
                    Continuar execução
                  </button>
                </div>
              </div>
            </section>

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

        {/* ── Próximas Execuções ── */}
        <div className="home-body-col">
          <div className="section-head">
            <div className="section-head-left">
              <span className="section-icon"><Clock size={13} /></span>
              <h3 className="section-title">Próximas Execuções</h3>
            </div>
            <Link to="/agenda" className="section-link">Ver todas</Link>
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
            <div className="panel-empty">
              <Clock size={26} />
              <span>Nenhuma outra execução na fila.</span>
            </div>
          )}
        </div>
       </div>

       {/* ── Aside: estatísticas reais + Casos Recentes + IA Assistente ── */}
       <aside className="cc-aside">
        <div className="cc-stat-grid">
          <div className="cc-stat-tile">
            <span className="cc-stat-label"><FolderKanban size={13} /> CASOS ATIVOS</span>
            <strong>{casosAtivos}</strong>
          </div>
          <div className="cc-stat-tile">
            <span className="cc-stat-label"><CheckCircle2 size={13} /> CONCLUÍDOS</span>
            <strong>{casosConcluidos}</strong>
          </div>
          <div className="cc-stat-tile">
            <span className="cc-stat-label"><Clock size={13} /> PRAZOS</span>
            <strong>{pending.length}</strong>
            {prazosUrgentes > 0 && <span className="cc-stat-flag">{prazosUrgentes} urgente{prazosUrgentes > 1 ? 's' : ''}</span>}
          </div>
          <div className="cc-stat-tile">
            <span className="cc-stat-label"><FileText size={13} /> DOCUMENTOS</span>
            <strong>{docsRecebidos}</strong>
          </div>
        </div>

        <div className="home-body-col">
          <div className="section-head">
            <div className="section-head-left">
              <span className="section-icon"><Folder size={13} /></span>
              <h3 className="section-title">Casos Recentes</h3>
            </div>
            {cases.length > 4 && <Link to="/cases" className="section-link">Ver todos</Link>}
          </div>

          {cases.length > 0 ? (
            <div className="recent-list">
              {cases.slice(0, 4).map((c) => {
                const tag = STATUS_TAG[c.status]
                return (
                  <Link key={c.id} to={`/cases/${c.id}`} className="recent-row">
                    <span className="recent-folder"><Folder size={16} /></span>
                    <div className="recent-row-info">
                      <strong>{c.title || c.clientName}</strong>
                      <span>{c.caseNumber ?? ETAPA_LABEL[c.etapaAtual]}</span>
                    </div>
                    <span className={`recent-status ${tag.cls}`}>{tag.label.toUpperCase()}</span>
                    <ArrowRight size={14} className="recent-open" />
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="panel-empty">
              <Folder size={26} />
              <span>Nenhum caso cadastrado.</span>
            </div>
          )}
        </div>

        {/* Painel IA Assistente */}
        <div className="ia-panel">
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
            {!caso ? 'SEM EXECUÇÃO ATIVA.' : docsPendentes === 0 ? 'PRONTA PARA GERAR A PEÇA.' : 'AGUARDANDO DOCUMENTOS.'}
          </p>
          <button
            className="ia-cta"
            onClick={() => caso && navigate(`/cases/${caso.id}/pecas`)}
            disabled={!caso}
          >
            Consultar IA
          </button>
        </div>
       </aside>
      </div>
    </div>
  )
}
