import { ArrowRight, CalendarClock, CircleDollarSign, FlaskConical, FolderPlus, MessageSquareText, Scale, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import { cases, deadlines } from '@/services/mockData'

const urgentCases = cases.slice(0, 3)

export function DashboardPage() {
  const criticalDeadlines = deadlines.filter((d) => d.priority === 'critical')
  const weekDeadlines = deadlines.filter((d) => d.businessDaysLeft <= 7)

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Fluxo operacional diario</p>
          <h1>Dashboard</h1>
          <p>O que exige sua atencao hoje</p>
        </div>
      </section>

      {/* Quick actions */}
      <div className="button-row">
        <Link to="/cases/new">
          <Button>
            <FolderPlus size={17} />
            Novo caso
          </Button>
        </Link>
        <Button variant="secondary">
          <Zap size={17} />
          Usar fluxo juridico
        </Button>
        <Button variant="secondary">
          <FlaskConical size={17} />
          Testar demonstracao
        </Button>
      </div>

      {/* Metrics */}
      <section className="metric-grid">
        <article className="metric-card critical">
          <CalendarClock size={22} />
          <strong>{criticalDeadlines.length}</strong>
          <span>Prazos criticos</span>
        </article>
        <article className="metric-card">
          <CalendarClock size={22} />
          <strong>{weekDeadlines.length}</strong>
          <span>Prazos da semana</span>
        </article>
        <article className="metric-card">
          <CircleDollarSign size={22} />
          <strong>R$ 8.500</strong>
          <span>Honorarios previstos</span>
        </article>
        <article className="metric-card">
          <CircleDollarSign size={22} />
          <strong>R$ 3.500</strong>
          <span>Honorarios pendentes</span>
        </article>
        <article className="metric-card">
          <MessageSquareText size={22} />
          <strong>1</strong>
          <span>Cliente aguardando resposta</span>
        </article>
      </section>

      {/* Prazos urgentes (left) + Casos urgentes (right) */}
      <section className="two-column">
        <article className="panel">
          <div className="panel-title">
            <h2>Prazos urgentes</h2>
            <Link to="/deadlines">Ver todos</Link>
          </div>
          <div className="list">
            {deadlines.map((deadline) => (
              <div
                className={`list-row deadline-row-${deadline.priority}`}
                key={deadline.id}
              >
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
                    {deadline.businessDaysLeft} dias uteis
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-title">
            <h2>Casos urgentes</h2>
            <Link to="/cases">Ver casos</Link>
          </div>
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

      {/* Proximas acoes — full width */}
      <article className="panel">
        <div className="panel-title">
          <h2>Proximas acoes</h2>
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
    </div>
  )
}
