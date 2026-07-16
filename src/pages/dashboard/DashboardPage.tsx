import {
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Folder,
  FolderKanban,
  Hourglass,
  Image as ImageIcon,
  Play,
  Sparkles,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { casesService } from '@/services/cases.service'
import { deadlinesService } from '@/services/deadlines.service'
import { useAuthStore } from '@/store/authStore'
import { relativeTime } from '@/lib/utils'
import type { Deadline, EtapaPipeline } from '@/types/domain.types'

const ETAPA_LABEL: Record<EtapaPipeline, string> = {
  cadastro: 'Cadastro',
  documentos: 'Documentos',
  pecas: 'Gerar Peças',
  prazos: 'Prazos',
  revisao: 'Revisão',
  protocolo: 'Revisão',
  atualizacoes: 'Revisão',
  encerramento: 'Encerramento',
}

const MISSION_PIPELINE: { key: EtapaPipeline; label: string; icon: typeof FileText }[] = [
  { key: 'cadastro', label: 'Cadastro', icon: CheckCircle2 },
  { key: 'documentos', label: 'Documentos', icon: CheckCircle2 },
  { key: 'pecas', label: 'Peça', icon: FileText },
  { key: 'prazos', label: 'Prazo', icon: Hourglass },
  { key: 'revisao', label: 'Revisão', icon: ImageIcon },
  { key: 'encerramento', label: 'Encerramento', icon: CheckCircle2 },
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

function hhmm(d: Date) {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
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

  // Estatísticas do painel de IA
  const docsRecebidos = caso?.recommendedDocuments.filter((d) => d.received).length ?? 0

  // Estatísticas reais para os tiles do Command Center
  const casosAtivos = cases.filter((c) => c.status !== 'arquivado' && c.status !== 'finalizado').length
  const casosHoje = cases.filter((c) => new Date(c.updatedAt).toDateString() === new Date().toDateString()).length
  const prazosUrgentes = pending.filter((d) => d.priority === 'critical').length

  const missionStageIdx = caso ? Math.max(0, MISSION_PIPELINE.findIndex((s) => s.key === caso.etapaAtual)) : 0

  // ── Últimos Casos: ordenados pela atividade mais recente (edição ou último acesso) ──
  const ultimosCasos = [...cases]
    .sort((a, b) => {
      const ta = Math.max(new Date(a.updatedAt).getTime(), a.ultimoAcessoEm ? new Date(a.ultimoAcessoEm).getTime() : 0)
      const tb = Math.max(new Date(b.updatedAt).getTime(), b.ultimoAcessoEm ? new Date(b.ultimoAcessoEm).getTime() : 0)
      return tb - ta
    })
    .slice(0, 4)

  // ── Próximos Prazos: os mais urgentes primeiro, já ordenados por data ──
  const proximosPrazos = [...pending]
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 4)

  return (
    <div className="home">
      {/* ── Cabeçalho: saudação + progresso ── */}
      <header className="home-header">
        <h1>{saudacao}, {user?.name?.split(' ')[0] ?? ''}.</h1>
        <div className="home-progress-row">
          <div className="home-progress-full">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <p>
            Sua operação jurídica está <strong>{pct}% organizada</strong> hoje.
          </p>
        </div>
      </header>

      <div className="cc-body">
       <div className="cc-main">
        {execucao && caso ? (
          <section className="mission-card">
            <div className="mission-main">
              <div className="mission-top">
                <span className="mission-heading">
                  <span className="section-icon"><Sparkles size={14} /></span>
                  Execução em Movimento
                </span>
                <span className="fluxo-prioritario-pill">Fluxo Prioritário</span>
              </div>

              <nav className="cc-stepper">
                {MISSION_PIPELINE.map((stage, idx) => {
                  const done = idx < missionStageIdx
                  const active = idx === missionStageIdx
                  const StageIcon = stage.icon
                  return (
                    <div key={stage.key} className={`cc-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
                      <span className="cc-step-dot">{done ? <CheckCircle2 size={16} /> : <StageIcon size={13} />}</span>
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
        ) : (
          <div className="panel mission-empty">
            <Sparkles size={30} style={{ color: 'var(--c-primary)' }} />
            <p>Nenhuma execução pendente. Tudo em dia por aqui.</p>
            <button className="mission-cta" onClick={() => navigate('/cases/new')}>
              <Play size={15} fill="currentColor" /> Nova Execução
            </button>
          </div>
        )}

        {/* ── Últimos Casos ── */}
        <div className="home-body-col motor-execucao">
          <div className="section-head">
            <div className="section-head-left">
              <span className="section-icon"><Folder size={13} /></span>
              <h3 className="section-title">Últimos Casos</h3>
            </div>
            <span className="live-insights-tag">
              <span className="live-dot" /> Live Insights
            </span>
          </div>

          <div className="motor-feed">
            {ultimosCasos.length > 0 ? ultimosCasos.map((c) => {
              const ultimaAtividade = c.ultimoAcessoEm && new Date(c.ultimoAcessoEm) > new Date(c.updatedAt)
                ? c.ultimoAcessoEm
                : c.updatedAt
              return (
                <Link key={c.id} to={`/cases/${c.id}`} className="motor-item motor-item-link">
                  <span className="motor-dot" />
                  <div className="motor-item-body">
                    <div className="motor-item-card">
                      <strong>{c.title || c.clientName}</strong>
                      <span className="motor-item-meta">{c.category || c.tipoServico || ETAPA_LABEL[c.etapaAtual]}</span>
                    </div>
                  </div>
                  <span className="motor-time motor-time-right">{relativeTime(ultimaAtividade)}</span>
                </Link>
              )
            }) : (
              <div className="panel-empty">
                <Folder size={26} />
                <span>Nenhum caso cadastrado ainda.</span>
              </div>
            )}
          </div>
        </div>
       </div>

       {/* ── Aside: estatísticas reais + Orbian Intelligence ── */}
       <aside className="cc-aside">
        <div className="cc-stat-grid">
          <div className="cc-stat-tile">
            <span className="cc-stat-label"><FolderKanban size={13} /> CASOS ATIVOS</span>
            <div className="cc-stat-value-row">
              <strong>{casosAtivos}</strong>
              {casosHoje > 0 && <span className="cc-stat-flag cc-stat-flag-muted">+{casosHoje} hoje</span>}
            </div>
          </div>
          <div className="cc-stat-tile">
            <span className="cc-stat-label"><Play size={13} /> EXECUÇÕES</span>
            <div className="cc-stat-value-row">
              <strong>{total}</strong>
              {total > 0 && <span className="cc-stat-flag cc-stat-flag-muted">In live</span>}
            </div>
          </div>
          <div className="cc-stat-tile">
            <span className="cc-stat-label"><Clock size={13} /> PRAZOS</span>
            <div className="cc-stat-value-row">
              <strong>{pending.length}</strong>
              {prazosUrgentes > 0 && <span className="cc-stat-flag cc-stat-flag-danger">Urgente</span>}
            </div>
          </div>
          <div className="cc-stat-tile">
            <span className="cc-stat-label"><FileText size={13} /> DOCUMENTOS</span>
            <div className="cc-stat-value-row">
              <strong>{docsRecebidos}</strong>
              <span className="cc-stat-flag cc-stat-flag-muted">OCR ok</span>
            </div>
          </div>
        </div>

        {/* Próximos Prazos */}
        <div className="home-body-col prazos-panel">
          <div className="section-head">
            <div className="section-head-left">
              <span className="section-icon"><CalendarDays size={13} /></span>
              <h3 className="section-title">Próximos Prazos</h3>
            </div>
            <Link to="/deadlines" className="section-link">Ver todos</Link>
          </div>

          {proximosPrazos.length > 0 ? (
            <div className="prazos-panel-list">
              {proximosPrazos.map((d) => {
                const label = dayLabel(d.dueDate)
                const urgente = label === 'Atrasado' || label === 'Hoje'
                const c = cases.find((x) => x.id === d.caseId)
                const hasTime = new Date(d.dueDate).getHours() !== 0 || new Date(d.dueDate).getMinutes() !== 0
                return (
                  <Link key={d.id} to={`/cases/${d.caseId}`} className={`prazos-panel-item ${urgente ? 'danger' : ''}`}>
                    <div className="prazos-panel-item-top">
                      <strong>{d.title}</strong>
                      <span className={`prazos-panel-badge ${urgente ? 'danger' : ''}`}>
                        {urgente && <span className="prazo-badge-dot" />}
                        {label.toUpperCase()}
                      </span>
                    </div>
                    <div className="prazos-panel-item-bottom">
                      <span>{c?.title || c?.clientName || d.caseTitle}</span>
                      <span>{hasTime ? hhmm(new Date(d.dueDate)) : label === 'Atrasado' || label === 'Hoje' || label === 'Amanhã' ? label : `${d.businessDaysLeft}d úteis`}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="panel-empty">
              <CalendarDays size={26} />
              <span>Nenhum prazo pendente.</span>
            </div>
          )}
        </div>
       </aside>
      </div>

      <footer className="dashboard-footer">
        <span>© {new Date().getFullYear()} Orbian.AI - O Sistema Operacional da Advocacia.</span>
        <div className="dashboard-footer-links">
          <a href="#">Privacidade</a>
          <a href="#">Termos</a>
          <a href="#">Suporte</a>
        </div>
      </footer>
    </div>
  )
}
