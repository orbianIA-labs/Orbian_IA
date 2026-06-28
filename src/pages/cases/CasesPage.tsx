import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { areaLabel, caseStatusLabel, caseStatusOptions } from '@/lib/utils'
import { casesService } from '@/services/cases.service'

export function CasesPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['cases', { status, q: search }],
    queryFn: () => casesService.list({ status: status || undefined, q: search || undefined }),
  })

  return (
    <div className="page-stack">
      <section className="page-heading compact">
        <div>
          <p className="eyebrow">Fonte de verdade</p>
          <h1>Casos</h1>
        </div>
        <Link to="/cases/new">
          <Button>
            <Plus size={18} />
            Novo caso
          </Button>
        </Link>
      </section>

      <section className="toolbar">
        <div className="search-field">
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar por cliente, processo ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {caseStatusOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
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
            <span>{caseStatusLabel(legalCase.status)}</span>
            <span>{legalCase.caseNumber ?? '—'}</span>
          </Link>
        ))}
        {!isLoading && cases.length === 0 && (
          <p style={{ color: 'var(--text-2)', padding: '1.5rem', textAlign: 'center' }}>
            {search || status ? (
              'Nenhum caso encontrado com esses filtros.'
            ) : (
              <>
                Nenhum caso cadastrado.{' '}
                <Link to="/cases/new" style={{ color: 'var(--accent)' }}>
                  Criar primeiro caso
                </Link>
              </>
            )}
          </p>
        )}
      </section>
    </div>
  )
}
