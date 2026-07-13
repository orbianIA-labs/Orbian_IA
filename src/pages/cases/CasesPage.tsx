import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  FolderKanban,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { casesService } from '@/services/cases.service'
import { deadlinesService } from '@/services/deadlines.service'
import { areaLabel, formatDate } from '@/lib/utils'
import type { CaseStatus, Deadline, EtapaPipeline, LegalCase } from '@/types/domain.types'

const TABS = [
  { value: 'em_andamento', label: 'Em Execução' },
  { value: 'all', label: 'Todos os Casos' },
  { value: 'aguardando_documentos', label: 'Aguardando Documentos' },
  { value: 'encerrados', label: 'Encerrados' },
  { value: 'arquivado', label: 'Arquivados' },
] as const

const STAGE_ORDER: { key: EtapaPipeline; label: string }[] = [
  { key: 'cadastro', label: 'Cadastro' },
  { key: 'documentos', label: 'Documentos' },
  { key: 'pecas', label: 'Peça' },
  { key: 'prazos', label: 'Prazos' },
  { key: 'revisao', label: 'Revisão' },
  { key: 'encerramento', label: 'Encerramento' },
]

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

function stageIndex(etapa: EtapaPipeline) {
  const idx = STAGE_ORDER.findIndex((s) => s.key === etapa)
  if (idx >= 0) return idx
  return etapa === 'protocolo' || etapa === 'atualizacoes' ? 4 : 0
}

function nextDeadlineFor(deadlines: Deadline[], caseId: string) {
  return deadlines
    .filter((d) => d.caseId === caseId && !d.completed)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0] ?? null
}

function isOverdue(dueDate: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(dueDate); d.setHours(0, 0, 0, 0)
  return d.getTime() < today.getTime()
}

function matchesTab(c: LegalCase, tab: (typeof TABS)[number]['value']) {
  if (tab === 'all') return true
  if (tab === 'encerrados') return c.status === 'finalizado'
  return c.status === (tab as CaseStatus)
}

export function CasesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<(typeof TABS)[number]['value']>('em_andamento')

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
          <p>Controle inteligente da sua operação jurídica.</p>
        </div>
        <Link to="/cases/new" className="cases-new-btn">
          <Button><Plus size={15} /> Novo Caso</Button>
        </Link>
      </div>

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

      <div className="cases-list">
        {isLoading && <p className="cases-grid-loading">Carregando...</p>}
        {!isLoading && filtered.length === 0 && (
          <div className="panel-empty">
            <FolderKanban size={26} />
            <span>Nenhum caso encontrado.</span>
          </div>
        )}
        {filtered.map((c) => {
          const next = nextDeadlineFor(deadlines, c.id)
          const overdue = next ? isOverdue(next.dueDate) : false
          const idx = stageIndex(c.etapaAtual)
          const acao = PROXIMA_ACAO[c.etapaAtual] ?? PROXIMA_ACAO.cadastro

          return (
            <div key={c.id} className="case-card-row">
              <div className="case-card-top">
                <div>
                  <h3>{c.title || c.clientName}</h3>
                  <p className="case-card-meta">{areaLabel(c.area)} · {c.caseNumber ?? 'sem número de processo'}</p>
                </div>
                <div className="case-card-next-action">
                  <span>PRÓXIMA AÇÃO</span>
                  <strong>{acao}</strong>
                </div>
              </div>

              <div className="case-card-stepper">
                {STAGE_ORDER.map((stage, i) => (
                  <div key={stage.key} className={`cc-step ${i < idx ? 'done' : ''} ${i === idx ? 'active' : ''}`}>
                    <span className="cc-step-dot">{i < idx ? <CheckCircle2 size={16} /> : i === idx ? <Circle size={10} fill="currentColor" /> : i + 1}</span>
                    <span className="cc-step-label">{stage.label}</span>
                  </div>
                ))}
              </div>

              <div className="case-card-bottom">
                {next ? (
                  <p className={`case-card-insight ${overdue ? 'danger' : ''}`}>
                    {overdue ? <AlertTriangle size={14} /> : <Sparkles size={14} />}
                    {overdue ? <>Prazo <strong>{next.title}</strong> atrasado.</> : <>Próximo prazo: <strong>{next.title}</strong> em {formatDate(next.dueDate)}.</>}
                  </p>
                ) : (
                  <p className="case-card-insight muted">
                    <Sparkles size={14} /> Nenhum prazo pendente para este caso.
                  </p>
                )}
                <div className="case-card-actions">
                  <Button variant="secondary" onClick={() => navigate(`/cases/${c.id}`)}>Visualizar</Button>
                  <Button onClick={() => navigate(`/cases/${c.id}`)}>Continuar</Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
