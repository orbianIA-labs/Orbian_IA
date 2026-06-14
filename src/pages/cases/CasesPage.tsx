import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { areaLabel, formatDate } from '@/lib/utils'
import { cases } from '@/services/mockData'

export function CasesPage() {
  return (
    <div className="page-stack">
      <section className="page-heading compact">
        <div>
          <p className="eyebrow">Fonte de verdade</p>
          <h1>Casos ativos</h1>
        </div>
        <Link to="/cases/new">
          <Button>
            <Plus size={18} />
            Novo caso
          </Button>
        </Link>
      </section>

      <section className="data-table">
        {cases.map((legalCase) => (
          <Link className="table-row" key={legalCase.id} to={`/cases/${legalCase.id}`}>
            <div>
              <strong>{legalCase.title}</strong>
              <span>{legalCase.caseNumber ?? 'Sem numero CNJ'}</span>
            </div>
            <span>{legalCase.clientName}</span>
            <span>{areaLabel(legalCase.area)}</span>
            <time>{formatDate(legalCase.updatedAt)}</time>
          </Link>
        ))}
      </section>
    </div>
  )
}
