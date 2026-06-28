import { ArrowRight, CalendarClock, CircleDollarSign, FolderPlus, History, Scale } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { caseStatusLabel, formatDate } from '@/lib/utils'
import { casesService } from '@/services/cases.service'
import { deadlinesService } from '@/services/deadlines.service'
import { monitoringService } from '@/services/monitoring.service'

export function DashboardPage() {
  const { data: cases = [] } = useQuery({
    queryKey: ['cases'],
    queryFn: () => casesService.list(),
  })

  const { data: deadlines = [] } = useQuery({
    queryKey: ['deadlines'],
    queryFn: deadlinesService.list,
  })

  const { data: movimentacoes = [] } = useQuery({
    queryKey: ['movimentacoes-recentes'],
    queryFn: () => monitoringService.recentes(6),
  })

  const criticalDeadlines = deadlines.filter((d) => d.priority === 'critical' && !d.completed)
  const weekDeadlines = deadlines.filter((d) => d.businessDaysLeft <= 7 && !d.completed)
  const aguardando = cases.filter(
    (c) => c.status === 'aguardando_documentos' || c.status === 'aguardando_prazo',
  )
  const recentCases = cases.slice(0, 3)

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Fluxo operacional diário</p>
          <h1>Dashboard</h1>
          <p>O que exige sua atenção hoje</p>
        </div>
      </section>

      <div className="button-row">
        <Link to="/cases/new">
          <Button>
            <FolderPlus size={17} />
            Novo caso
          </Button>
        </Link>
      </div>

      <section className="metric-grid">
        <article className="metric-card critical">
          <CalendarClock size={22} />
          <strong>{criticalDeadlines.length}</strong>
          <span>Prazos críticos</span>
        </article>
        <article className="metric-card">
          <CalendarClock size={22} />
          <strong>{weekDeadlines.length}</strong>
          <span>Prazos da semana</span>
        </article>
        <article className="metric-card">
          <CircleDollarSign size={22} />
          <strong>{cases.length}</strong>
          <span>Casos ativos</span>
        </article>
        <article className="metric-card">
          <Scale size={22} />
          <strong>{aguardando.length}</strong>
          <span>Clientes aguardando</span>
        </article>
      </section>

      <section className="two-column">
        <article className="panel">
          <div className="panel-title">
            <h2>Prazos urgentes</h2>
            <Link to="/deadlines">Ver todos</Link>
          </div>
          {deadlines.filter((d) => !d.completed).length === 0 && (
            <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Nenhum prazo pendente</p>
          )}
          <div className="list">
            {deadlines
              .filter((d) => !d.completed)
              .slice(0, 5)
              .map((deadline) => (
                <div className={`list-row deadline-row-${deadline.priority}`} key={deadline.id}>
                  <div>
                    <strong>{deadline.title}</strong>
                    <span>{deadline.caseTitle}</span>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <time style={{ display: 'block', fontWeight: 700 }}>
                      {formatDate(deadline.dueDate)}
                    </time>
                    <span
                      style={{
                        fontSize: 12,
                        color:
                          deadline.priority === 'critical'
                            ? 'var(--danger)'
                            : deadline.priority === 'attention'
                              ? 'var(--warning)'
                              : 'var(--muted)',
                      }}
                    >
                      {deadline.businessDaysLeft} dias úteis
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-title">
            <h2>
              <History size={17} style={{ display: 'inline', marginRight: 6, verticalAlign: -3 }} />
              Últimas movimentações
            </h2>
          </div>
          {movimentacoes.length === 0 && (
            <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
              Nenhuma movimentação. Atualize um processo na tela do caso.
            </p>
          )}
          <div className="list">
            {movimentacoes.map((mov) => (
              <Link className="list-row action-row" key={mov.id} to={`/cases/${mov.caseId}`}>
                <div>
                  <strong>{mov.clientName}</strong>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--text-2)' }}>
                    {mov.description}
                  </span>
                </div>
                <time style={{ flexShrink: 0 }}>{formatDate(mov.date)}</time>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="two-column">
        <article className="panel">
          <div className="panel-title">
            <h2>Casos recentes</h2>
            <Link to="/cases">Ver casos</Link>
          </div>
          {recentCases.length === 0 && (
            <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Nenhum caso cadastrado</p>
          )}
          <div className="list">
            {recentCases.map((legalCase) => (
              <Link className="list-row action-row" key={legalCase.id} to={`/cases/${legalCase.id}`}>
                <div>
                  <strong>{legalCase.clientName}</strong>
                  <span>{caseStatusLabel(legalCase.status)}</span>
                </div>
                <ArrowRight size={17} />
              </Link>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-title">
            <h2>Clientes aguardando atualização</h2>
          </div>
          {aguardando.length === 0 && (
            <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Nenhum cliente aguardando</p>
          )}
          <div className="list">
            {aguardando.map((legalCase) => (
              <Link className="list-row action-row" key={legalCase.id} to={`/cases/${legalCase.id}`}>
                <div>
                  <strong>{legalCase.clientName}</strong>
                  <span>{caseStatusLabel(legalCase.status)}</span>
                </div>
                <ArrowRight size={17} />
              </Link>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}
