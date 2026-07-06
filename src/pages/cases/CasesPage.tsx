import { useState } from 'react'
import { FolderKanban, Plus, Search } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { casesService } from '@/services/cases.service'
import { deadlinesService } from '@/services/deadlines.service'
import { areaLabel, caseStatusLabel } from '@/lib/utils'

type FilterTab = 'all' | 'em_andamento' | 'finalizado' | 'prazo_hoje' | 'atrasado'

const ETAPA_LABELS: Record<string, string> = {
  cadastro: 'Cadastro',
  documentos: 'Documentos',
  pecas: 'Peças',
  revisao: 'Revisão',
  protocolo: 'Protocolo',
  atualizacoes: 'Atualizações',
  encerramento: 'Encerrado',
}

export function CasesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterTab>('all')

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['cases'],
    queryFn: () => casesService.list(),
  })

  const { data: deadlines = [] } = useQuery({
    queryKey: ['deadlines'],
    queryFn: deadlinesService.list,
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  function isOverdue(caseId: string) {
    return deadlines.some((d) => {
      if (d.caseId !== caseId || d.completed) return false
      const due = new Date(d.dueDate); due.setHours(0, 0, 0, 0)
      return due.getTime() < today.getTime()
    })
  }

  function hasPrazoHoje(caseId: string) {
    return deadlines.some((d) => {
      if (d.caseId !== caseId || d.completed) return false
      const due = new Date(d.dueDate); due.setHours(0, 0, 0, 0)
      return due.getTime() === today.getTime()
    })
  }

  const displayedCases = cases.filter((c) => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      c.title.toLowerCase().includes(q) ||
      c.clientName.toLowerCase().includes(q) ||
      (c.caseNumber ?? '').toLowerCase().includes(q)
    if (!matchSearch) return false
    if (filter === 'em_andamento') return c.status === 'em_andamento'
    if (filter === 'finalizado') return c.status === 'finalizado'
    if (filter === 'prazo_hoje') return hasPrazoHoje(c.id)
    if (filter === 'atrasado') return isOverdue(c.id)
    return true
  })

  const counts: Record<FilterTab, number> = {
    all: cases.length,
    em_andamento: cases.filter((c) => c.status === 'em_andamento').length,
    finalizado: cases.filter((c) => c.status === 'finalizado').length,
    prazo_hoje: cases.filter((c) => hasPrazoHoje(c.id)).length,
    atrasado: cases.filter((c) => isOverdue(c.id)).length,
  }

  return (
    <div className="page-stack">
      <div className="cases-toolbar">
        <div className="search-field">
          <Search size={15} />
          <input
            type="text"
            placeholder="Buscar caso, cliente ou Nº processo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Link to="/cases/new">
          <Button><Plus size={15} /> Novo caso</Button>
        </Link>
      </div>

      <div className="filter-tabs">
        {([
          ['all', 'Todos'],
          ['em_andamento', 'Em andamento'],
          ['finalizado', 'Concluídos'],
          ['prazo_hoje', 'Com prazo hoje'],
          ['atrasado', 'Em atraso'],
        ] as [FilterTab, string][]).map(([key, label]) => (
          <button
            key={key}
            className={`filter-tab ${filter === key ? 'active' : ''}`}
            onClick={() => setFilter(key)}
          >
            {label}
            {counts[key] > 0 && (
              <span className={`filter-count${filter === key ? ' active' : ''}`}>{counts[key]}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading && <p style={{ color: 'var(--muted)', padding: '1rem' }}>Carregando...</p>}

      {!isLoading && displayedCases.length === 0 && (
        <div className="empty-state">
          <FolderKanban size={40} style={{ opacity: 0.3, color: 'var(--muted)' }} />
          <h3>Nenhum caso encontrado</h3>
          <p>{search || filter !== 'all' ? 'Tente outros filtros.' : 'Crie seu primeiro caso para começar.'}</p>
          {filter === 'all' && !search && <Link to="/cases/new"><Button>Novo caso</Button></Link>}
        </div>
      )}

      <div className="cases-list">
        {displayedCases.map((c) => {
          const caseDeadlines = deadlines
            .filter((d) => d.caseId === c.id && !d.completed)
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
          const next = caseDeadlines[0]
          const overdue = next
            ? (() => { const d = new Date(next.dueDate); d.setHours(0, 0, 0, 0); return d.getTime() < today.getTime() })()
            : false

          return (
            <div key={c.id} className="case-card-row">
              <div className="case-card-icon-wrap">
                <FolderKanban size={19} />
              </div>

              <div className="case-card-body">
                <div className="case-card-top-row">
                  <h3 className="case-card-title">{c.title}</h3>
                  <span className="stage-pill">{ETAPA_LABELS[c.etapaAtual] ?? c.etapaAtual}</span>
                </div>
                <p className="case-card-client">{c.clientName} · {areaLabel(c.area)}</p>
                {next && (
                  <p className={`case-card-deadline${overdue ? ' overdue' : ''}`}>
                    {overdue ? 'Atrasado: ' : 'Próximo prazo: '}{next.title} · {next.businessDaysLeft}d úteis
                  </p>
                )}
              </div>

              <div className="case-card-right">
                <span className={`badge ${
                  c.status === 'em_andamento' ? 'badge-normal' :
                  c.status === 'finalizado' ? 'badge-done' :
                  c.status === 'arquivado' ? 'badge-muted' : 'badge-attention'
                }`}>{caseStatusLabel(c.status)}</span>
                <Button onClick={() => navigate(`/cases/${c.id}`)}>Abrir Workspace</Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
