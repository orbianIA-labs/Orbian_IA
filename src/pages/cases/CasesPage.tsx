import { useMemo, useState } from 'react'
import {
  ChevronRight,
  Filter,
  FolderKanban,
  Plus,
  Search,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { casesService } from '@/services/cases.service'
import { deadlinesService } from '@/services/deadlines.service'
import { areaLabel, formatDate, relativeTime } from '@/lib/utils'
import type { CaseStatus, Deadline, EtapaPipeline, LegalCase } from '@/types/domain.types'

const TABS = [
  { value: 'em_andamento', label: 'Em Execução' },
  { value: 'all', label: 'Todos os Casos' },
  { value: 'aguardando_documentos', label: 'Aguardando Documentos' },
  { value: 'encerrados', label: 'Encerrados' },
  { value: 'arquivado', label: 'Arquivados' },
] as const

const PROXIMA_ACAO: Record<EtapaPipeline, string> = {
  cadastro: 'Completar cadastro do caso',
  documentos: 'Anexar documentos obrigatórios',
  pecas: 'Gerar petição inicial',
  prazos: 'Cadastrar prazo do processo',
  revisao: 'Revisar execução',
  protocolo: 'Revisar execução',
  atualizacoes: 'Revisar execução',
  encerramento: 'Finalizar caso',
}

const STATUS_BADGE: Record<CaseStatus, { label: string; cls: string }> = {
  em_andamento: { label: 'Em andamento', cls: 'info' },
  aguardando_documentos: { label: 'Aguardando documentos', cls: 'warning' },
  aguardando_prazo: { label: 'Aguardando prazo', cls: 'warning' },
  finalizado: { label: 'Concluído', cls: 'success' },
  arquivado: { label: 'Arquivado', cls: 'muted' },
}

function nextDeadlineFor(deadlines: Deadline[], caseId: string) {
  return deadlines
    .filter((d) => d.caseId === caseId && !d.completed)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0] ?? null
}

function matchesTab(c: LegalCase, tab: (typeof TABS)[number]['value']) {
  if (tab === 'all') return true
  if (tab === 'encerrados') return c.status === 'finalizado'
  return c.status === (tab as CaseStatus)
}

export function CasesPage() {
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<(typeof TABS)[number]['value']>('em_andamento')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const { data: cases = [], isLoading } = useQuery({ queryKey: ['cases'], queryFn: () => casesService.list() })
  const { data: deadlines = [] } = useQuery({ queryKey: ['deadlines'], queryFn: deadlinesService.list })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return cases.filter((c) => {
      if (!matchesTab(c, tab)) return false
      if (q) {
        const matches =
          c.title.toLowerCase().includes(q) ||
          c.clientName.toLowerCase().includes(q) ||
          (c.caseNumber ?? '').toLowerCase().includes(q)
        if (!matches) return false
      }
      return true
    })
  }, [cases, search, tab])

  return (
    <div className="cases-page">
      <div className="cases-page-header">
        <div>
          <h1>Casos</h1>
          <p>{filtered.length} casos ativos · conduzidos pela Orbian</p>
        </div>
        <div className="cases-header-actions">
          <button
            className={`cases-filter-btn ${filtersOpen ? 'active' : ''}`}
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <Filter size={15} /> Filtros
          </button>
          <Link to="/cases/new" className="cases-new-btn">
            <Button><Plus size={15} /> Novo caso</Button>
          </Link>
        </div>
      </div>

      {filtersOpen && (
        <div className="cases-filters-panel">
          <label className="cases-search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Pesquisar casos, clientes ou documentos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <nav className="cases-tabs">
            {TABS.map((t) => (
              <button
                key={t.value}
                className={tab === t.value ? 'active' : ''}
                onClick={() => setTab(t.value)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      )}

      <div className="cases-grid">
        {isLoading && <p className="cases-grid-loading">Carregando...</p>}
        {!isLoading && filtered.length === 0 && (
          <div className="panel-empty">
            <FolderKanban size={26} />
            <span>Nenhum caso encontrado.</span>
          </div>
        )}
        {filtered.map((c) => {
          const next = nextDeadlineFor(deadlines, c.id)
          const acao = PROXIMA_ACAO[c.etapaAtual] ?? PROXIMA_ACAO.cadastro
          const badge = STATUS_BADGE[c.status]

          return (
            <Link key={c.id} to={`/cases/${c.id}`} className="case-tile">
              <div className="case-tile-top">
                <div className="case-tile-name">
                  <FolderKanban size={14} />
                  <h3>{c.title || c.clientName}</h3>
                </div>
                <span className={`case-tile-badge ${badge.cls}`}>{badge.label}</span>
              </div>

              <p className="case-tile-number">{c.caseNumber ?? 'Sem número de processo'}</p>
              <p className="case-tile-area">{areaLabel(c.area)}</p>

              <div className="case-tile-divider" />

              <p className="case-tile-action">{acao}</p>

              <div className="case-tile-bottom">
                <span className="case-tile-deadline">
                  {next ? `${next.title} — ${formatDate(next.dueDate)}` : 'Sem prazos ativos'}
                </span>
                <span className="case-tile-time">
                  {relativeTime(c.updatedAt)}
                  <ChevronRight size={14} />
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
