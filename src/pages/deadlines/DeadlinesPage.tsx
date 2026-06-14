import { CalendarDays } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { deadlines } from '@/services/mockData'

export function DeadlinesPage() {
  return (
    <div className="page-stack">
      <section className="page-heading compact">
        <div>
          <p className="eyebrow">Pilar 2</p>
          <h1>Controle de prazos</h1>
        </div>
      </section>

      <section className="deadline-board">
        {deadlines.map((deadline) => (
          <article className={`deadline-card ${deadline.priority}`} key={deadline.id}>
            <CalendarDays size={20} />
            <div>
              <h2>{deadline.title}</h2>
              <p>{deadline.caseTitle}</p>
              <strong>{deadline.businessDaysLeft} dias uteis restantes</strong>
            </div>
            <time>{formatDate(deadline.dueDate)}</time>
          </article>
        ))}
      </section>
    </div>
  )
}
