import { ArrowRight, CalendarClock, CircleDollarSign, FolderPlus, MessageSquareText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import { cases } from '@/services/mockData'
import { deadlines } from '@/services/mockData'

export function DashboardPage() {
  const criticalDeadlines = deadlines.filter((deadline) => deadline.priority === 'critical')

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Fluxo operacional diario</p>
          <h1>Bom dia. Estes sao os pontos que precisam da sua atencao.</h1>
        </div>
        <Link to="/cases/new">
          <Button>
            <FolderPlus size={18} />
            Novo caso
          </Button>
        </Link>
      </section>

      <section className="metric-grid">
        <article className="metric-card critical">
          <CalendarClock size={22} />
          <strong>{criticalDeadlines.length}</strong>
          <span>Prazos criticos</span>
        </article>
        <article className="metric-card">
          <CalendarClock size={22} />
          <strong>3</strong>
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

      <section className="two-column">
        <article className="panel">
          <div className="panel-title">
            <h2>Proximas acoes</h2>
            <Link to="/cases">Ver casos</Link>
          </div>
          <div className="list">
            {cases.map((legalCase) => (
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

        <article className="panel">
          <div className="panel-title">
            <h2>Prazos urgentes</h2>
            <Link to="/deadlines">Ver todos</Link>
          </div>
          <div className="list">
            {deadlines.map((deadline) => (
              <div className="list-row" key={deadline.id}>
                <div>
                  <strong>{deadline.title}</strong>
                  <span>{deadline.caseTitle}</span>
                </div>
                <time>{formatDate(deadline.dueDate)}</time>
              </div>
            ))}
          </div>
        </article>
      </section>

      <article className="panel">
        <div className="panel-title">
          <h2>Casos recentes</h2>
          <Link to="/cases">Abrir casos</Link>
        </div>
        <div className="case-progress-list">
          {cases.map((legalCase) => (
            <Link className="case-progress-row" key={legalCase.id} to={`/cases/${legalCase.id}`}>
              <div>
                <strong>{legalCase.clientName}</strong>
                <span>{legalCase.category}</span>
              </div>
              <progress max="100" value={legalCase.progress} />
              <strong>{legalCase.progress}%</strong>
            </Link>
          ))}
        </div>
      </article>
    </div>
  )
}
