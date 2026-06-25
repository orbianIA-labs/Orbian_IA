import { ArrowRight, CalendarClock, CircleDollarSign, FolderPlus, Scale } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import { casesService } from '@/services/cases.service'
import { deadlinesService } from '@/services/deadlines.service'

export function DashboardPage() {
  const { data: cases = [] } = useQuery({
    queryKey: ['cases'],
    queryFn: casesService.list,
  })

  const { data: deadlines = [] } = useQuery({
    queryKey: ['deadlines'],
    queryFn: deadlinesService.list,
  })

  const criticalDeadlines = deadlines.filter((d) => d.priority === 'critical' && !d.completed)
  const weekDeadlines = deadlines.filter((d) => d.businessDaysLeft <= 7 && !d.completed)
  const urgentCases = cases.slice(0, 3)

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
          <strong>{deadlines.filter((d) => !d.completed).length}</strong>
          <span>Prazos pendentes</span>
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
            <h2>Casos recentes</h2>
            <Link to="/cases">Ver casos</Link>
          </div>
          {urgentCases.length === 0 && (
            <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Nenhum caso cadastrado</p>
          )}
          <div className="list">
            {urgentCases.map((legalCase) => (
              <Link className="list-row action-row" key={legalCase.id} to={`/cases/${legalCase.id}`}>
                <div>
                  <strong>{legalCase.clientName}</strong>
                  <span>{legalCase.nextAction}</span>
                </div>
                <ArrowRight size={17} />
              </Link>
            ))}
          </div>
        </article>
      </section>

      {cases.length > 0 && (
        <article className="panel">
          <div className="panel-title">
            <h2>Todos os casos</h2>
            <Link to="/cases">Ver casos</Link>
          </div>
          <div className="case-progress-list">
            {cases.map((legalCase) => (
              <Link className="case-progress-row" key={legalCase.id} to={`/cases/${legalCase.id}`}>
                <div>
                  <strong>{legalCase.clientName}</strong>
                  <span>{legalCase.nextAction}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Scale size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--muted)', fontSize: 13 }}>{legalCase.category}</span>
                </div>
                <ArrowRight size={17} style={{ color: 'var(--muted)', marginLeft: 'auto' }} />
              </Link>
            ))}
          </div>
        </article>
      )}
    </div>
  )
}
