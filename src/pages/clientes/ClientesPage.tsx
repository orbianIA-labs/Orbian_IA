import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Search, User, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { clientesService } from '@/services/clientes.service'
import { formatDate } from '@/lib/utils'

export function ClientesPage() {
  const [search, setSearch] = useState('')
  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes', search],
    queryFn: () => clientesService.list(search || undefined),
  })

  return (
    <div className="cases-page">
      <div className="cases-page-header">
        <div>
          <h1>Clientes</h1>
          <p>{clientes.length} cliente{clientes.length !== 1 ? 's' : ''} · conduzidos pela Orbian</p>
        </div>
        <div className="cases-header-actions">
          <label className="cases-search" style={{ maxWidth: 260 }}>
            <Search size={14} />
            <input
              type="text"
              placeholder="Pesquisar clientes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <Link to="/clientes/new" className="cases-new-btn">
            <Button><User size={15} /> Novo Cliente</Button>
          </Link>
        </div>
      </div>

      <div className="cases-grid">
        {isLoading && <p className="cases-grid-loading">Carregando...</p>}
        {!isLoading && clientes.length === 0 && (
          <div className="panel-empty">
            <Users size={26} />
            <span>Nenhum cliente cadastrado ainda.</span>
          </div>
        )}
        {clientes.map((c) => (
          <Link key={c.id} to={`/clientes/${c.id}`} className="case-tile">
            <div className="case-tile-top">
              <div className="case-tile-name">
                <User size={14} />
                <h3>{c.nome}</h3>
              </div>
            </div>

            <p className="case-tile-number">{c.cpfCnpj ?? 'CPF/CNPJ não informado'}</p>
            <p className="case-tile-area">{c.telefone ?? c.email ?? 'Sem contato cadastrado'}</p>

            <div className="case-tile-divider" />

            <div className="case-tile-bottom">
              <span className="case-tile-time">
                Cliente desde {formatDate(c.createdAt)}
                <ChevronRight size={14} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
