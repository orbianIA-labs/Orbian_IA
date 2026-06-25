import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { areaLabel } from '@/lib/utils'
import { casesService } from '@/services/cases.service'

export function CasesPage() {
  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['cases'],
    queryFn: casesService.list,
  })

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

      {isLoading && <p style={{ color: 'var(--text-2)', padding: '1rem' }}>Carregando...</p>}

      <section className="data-table">
        {cases.map((legalCase) => (
          <Link className="table-row" key={legalCase.id} to={`/cases/${legalCase.id}`}>
            <div>
              <strong>{legalCase.clientName}</strong>
              <span>{legalCase.flow || legalCase.category}</span>
            </div>
            <span>{areaLabel(legalCase.area)}</span>
            <span>{legalCase.category}</span>
            <span>
              {legalCase.status === 'active'
                ? 'Em andamento'
                : legalCase.status === 'done'
                  ? 'Concluído'
                  : 'Aguardando'}
            </span>
            <span>{legalCase.nextAction}</span>
          </Link>
        ))}
        {!isLoading && cases.length === 0 && (
          <p style={{ color: 'var(--text-2)', padding: '1.5rem', textAlign: 'center' }}>
            Nenhum caso cadastrado.{' '}
            <Link to="/cases/new" style={{ color: 'var(--accent)' }}>
              Criar primeiro caso
            </Link>
          </p>
        )}
      </section>
    </div>
  )
}
