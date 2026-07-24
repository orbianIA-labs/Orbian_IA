import {
  Building2,
  CheckCircle2,
  FileText,
  Folder,
  FolderKanban,
  Image as ImageIcon,
  Play,
  Sparkles,
  Star,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { casesService } from '@/services/cases.service'
import { useAuthStore } from '@/store/authStore'
import { relativeTime } from '@/lib/utils'
import type { EtapaPipeline } from '@/types/domain.types'

const ETAPA_LABEL: Record<EtapaPipeline, string> = {
  cadastro: 'Cadastro',
  documentos: 'Documentos',
  pecas: 'Gerar Peças',
  revisao: 'Revisão',
  protocolo: 'Revisão',
  atualizacoes: 'Revisão',
  encerramento: 'Encerramento',
}

const MISSION_PIPELINE: { key: EtapaPipeline; label: string; icon: typeof FileText }[] = [
  { key: 'cadastro', label: 'Cadastro', icon: CheckCircle2 },
  { key: 'documentos', label: 'Documentos', icon: CheckCircle2 },
  { key: 'pecas', label: 'Peça', icon: FileText },
  { key: 'revisao', label: 'Revisão', icon: ImageIcon },
  { key: 'encerramento', label: 'Encerramento', icon: CheckCircle2 },
]

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  const { data: cases = [] } = useQuery({ queryKey: ['cases'], queryFn: () => casesService.list() })

  const concluidos = cases.filter((c) => c.status === 'finalizado' || c.status === 'arquivado').length
  const pct = cases.length > 0 ? Math.round((concluidos / cases.length) * 100) : 0

  // ── Últimos Casos: ordenados pela atividade mais recente (edição ou último acesso) ──
  const ultimosCasos = [...cases]
    .sort((a, b) => {
      const ta = Math.max(new Date(a.updatedAt).getTime(), a.ultimoAcessoEm ? new Date(a.ultimoAcessoEm).getTime() : 0)
      const tb = Math.max(new Date(b.updatedAt).getTime(), b.ultimoAcessoEm ? new Date(b.ultimoAcessoEm).getTime() : 0)
      return tb - ta
    })
    .slice(0, 4)

  // ── Execução em Movimento: caso ativo mais recentemente trabalhado ──
  const caso = ultimosCasos.find((c) => c.status !== 'arquivado' && c.status !== 'finalizado') ?? null

  // Estatísticas do painel de IA
  const docsRecebidos = caso?.recommendedDocuments.filter((d) => d.received).length ?? 0

  // Estatísticas reais para os tiles do Command Center
  const casosAtivos = cases.filter((c) => c.status !== 'arquivado' && c.status !== 'finalizado').length
  const casosHoje = cases.filter((c) => new Date(c.updatedAt).toDateString() === new Date().toDateString()).length
  const favoritos = cases.filter((c) => c.favorito).length

  const missionStageIdx = caso ? Math.max(0, MISSION_PIPELINE.findIndex((s) => s.key === caso.etapaAtual)) : 0

  return (
    <div className="home">
      {/* ── Cabeçalho: saudação + progresso ── */}
      <header className="home-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h1>{saudacao}, {user?.name?.split(' ')[0] ?? ''}.</h1>
          <Link to="/profile?section=escritorio" className="home-escritorio-link" title="Cadastro do escritório">
            <Building2 size={15} /> Escritório
          </Link>
        </div>
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
        {caso ? (
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
                  <p className="mission-sub">{caso.caseNumber ?? ETAPA_LABEL[caso.etapaAtual]} · Atualizado {relativeTime(caso.updatedAt)}</p>
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
            <span className="cc-stat-label"><Play size={13} /> TOTAL DE CASOS</span>
            <div className="cc-stat-value-row">
              <strong>{cases.length}</strong>
              {cases.length > 0 && <span className="cc-stat-flag cc-stat-flag-muted">In live</span>}
            </div>
          </div>
          <div className="cc-stat-tile">
            <span className="cc-stat-label"><Star size={13} /> FAVORITOS</span>
            <div className="cc-stat-value-row">
              <strong>{favoritos}</strong>
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
       </aside>
      </div>

      <footer className="dashboard-footer">
        <span>© {new Date().getFullYear()} Orbian - O Sistema Operacional da Advocacia.</span>
        <div className="dashboard-footer-links">
          <a href="#">Privacidade</a>
          <a href="#">Termos</a>
          <a href="#">Suporte</a>
        </div>
      </footer>
    </div>
  )
}
