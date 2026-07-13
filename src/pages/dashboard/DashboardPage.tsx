import {
  CheckCircle2,
  Clock,
  FileText,
  FolderKanban,
  Hourglass,
  Image as ImageIcon,
  Lightbulb,
  Play,
  Sparkles,
  Workflow,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/axios'
import { casesService } from '@/services/cases.service'
import { deadlinesService } from '@/services/deadlines.service'
import { useAuthStore } from '@/store/authStore'
import type { Deadline, EtapaPipeline } from '@/types/domain.types'

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
  const docsPendentes = caso?.recommendedDocuments.filter((d) => !d.received).length ?? 0

  // Estatísticas reais para os tiles do Command Center
  const casosAtivos = cases.filter((c) => c.status !== 'arquivado' && c.status !== 'finalizado').length
  const casosHoje = cases.filter((c) => new Date(c.updatedAt).toDateString() === new Date().toDateString()).length
  const prazosUrgentes = pending.filter((d) => d.priority === 'critical').length

  const missionStageIdx = caso ? Math.max(0, MISSION_PIPELINE.findIndex((s) => s.key === caso.etapaAtual)) : 0

  // ── Motor de Execução: foca no caso aberto mais recentemente pelo advogado;
  // sem nenhum acesso registrado, cai para o caso marcado como favorito. ──
  const casoRecente = [...cases]
    .filter((c) => c.ultimoAcessoEm)
    .sort((a, b) => new Date(b.ultimoAcessoEm!).getTime() - new Date(a.ultimoAcessoEm!).getTime())[0]
  const casoFavorito = cases.find((c) => c.favorito)
  const casoFoco = casoRecente ?? casoFavorito ?? caso

  const { data: pecasFoco = [] } = useQuery<{ id: string; categoria: string; createdAt: string }[]>({
    queryKey: ['pecas', casoFoco?.id],
    queryFn: () => api.get(`/api/casos/${casoFoco!.id}/pecas`).then((r) => r.data),
    enabled: !!casoFoco?.id,
  })

  const feed = casoFoco ? [
    ...(pecasFoco[0] ? [{
      time: hhmm(new Date(pecasFoco[0].createdAt)),
      title: 'Peça gerada',
      text: `"${pecasFoco[0].categoria}" foi gerada para "${casoFoco.title || casoFoco.clientName}".`,
    }] : []),
    {
      time: hhmm(new Date(casoFoco.updatedAt)),
      title: casoRecente ? 'Caso aberto recentemente' : casoFavorito ? 'Caso favorito' : 'Caso atualizado',
      text: `"${casoFoco.title || casoFoco.clientName}" · etapa atual: ${MISSION_PIPELINE.find((s) => s.key === casoFoco.etapaAtual)?.label ?? casoFoco.etapaAtual}.`,
    },
  ] : []

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

        {/* ── Motor de Execução ── */}
        <div className="home-body-col motor-execucao">
          <div className="section-head">
            <div className="section-head-left">
              <span className="section-icon"><Workflow size={13} /></span>
              <h3 className="section-title">Motor de Execução</h3>
            </div>
            <span className="live-insights-tag">
              <span className="live-dot" /> Live Insights
            </span>
          </div>

          <div className="motor-feed">
            {feed.length > 0 ? feed.map((item, i) => (
              <div key={i} className="motor-item">
                <span className="motor-dot" />
                <div className="motor-item-body">
                  <span className="motor-time">{item.time}</span>
                  <div className="motor-item-card">
                    <strong>{item.title}</strong>
                    {item.text && <p>"{item.text}"</p>}
                  </div>
                </div>
              </div>
            )) : (
              <div className="panel-empty">
                <Workflow size={26} />
                <span>Nenhum caso recente ou favorito para acompanhar ainda.</span>
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

        {/* Painel Orbian Intelligence */}
        <div className="ia-panel orbian-intel">
          <div className="ia-panel-head">
            <span className="ia-panel-icon"><Sparkles size={16} /></span>
            <strong>Orbian Intelligence</strong>
          </div>

          <div className="intel-card">
            <span className="intel-card-label">ALERTA DE PRODUTIVIDADE</span>
            <p>
              {prazosUrgentes > 0
                ? `Detectamos ${prazosUrgentes} prazo${prazosUrgentes > 1 ? 's' : ''} com risco de atraso por falta de documento de terceiros.`
                : 'Nenhum prazo em risco no momento.'}
            </p>
            <button className="intel-card-link" type="button" onClick={() => navigate('/deadlines')}>
              Enviar notificações automáticas →
            </button>
          </div>

          <div className="intel-card">
            <span className="intel-card-label">INSIGHT ESTRATÉGICO</span>
            <p>
              {docsPendentes === 0 && caso
                ? `Todos os documentos de "${caso.title || caso.clientName}" foram recebidos.`
                : `Sua operação processou ${docsRecebidos} documento${docsRecebidos === 1 ? '' : 's'} até agora.`}
            </p>
          </div>

          <button
            className="intel-suggestion"
            type="button"
            onClick={() => caso && navigate(`/cases/${caso.id}/documentos`)}
          >
            <Lightbulb size={15} />
            <span>Gostaria que eu automatizasse a extração de dados das próximas 5 petições?</span>
          </button>
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
