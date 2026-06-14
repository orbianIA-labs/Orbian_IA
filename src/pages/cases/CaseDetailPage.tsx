import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { areaLabel, formatDate } from '@/lib/utils'
import { cases, deadlines } from '@/services/mockData'

export function CaseDetailPage() {
  const { id } = useParams()
  const legalCase = cases.find((item) => item.id === id) ?? cases[0]
  const caseDeadlines = deadlines.filter((deadline) => deadline.caseId === legalCase.id)

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">{areaLabel(legalCase.area)}</p>
          <h1>{legalCase.title}</h1>
          <p>{legalCase.clientName}</p>
        </div>
        <Button>Gerar resumo para cliente</Button>
      </section>

      <section className="two-column">
        <article className="panel">
          <h2>Dados do caso</h2>
          <dl className="definition-list">
            <div>
              <dt>Numero</dt>
              <dd>{legalCase.caseNumber ?? 'Nao informado'}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{legalCase.status}</dd>
            </div>
            <div>
              <dt>Atualizado</dt>
              <dd>{formatDate(legalCase.updatedAt)}</dd>
            </div>
          </dl>
        </article>

        <article className="panel">
          <h2>Prazos vinculados</h2>
          <div className="list">
            {caseDeadlines.map((deadline) => (
              <div className="list-row" key={deadline.id}>
                <div>
                  <strong>{deadline.title}</strong>
                  <span>{deadline.businessDaysLeft} dias uteis restantes</span>
                </div>
                <time>{formatDate(deadline.dueDate)}</time>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}
