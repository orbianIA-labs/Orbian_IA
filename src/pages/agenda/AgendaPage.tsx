import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Search } from 'lucide-react'
import { deadlinesService } from '@/services/deadlines.service'
import { casesService } from '@/services/cases.service'
import { formatDate } from '@/lib/utils'
import type { Deadline, EtapaPipeline } from '@/types/domain.types'

type Tab = 'todos' | 'hoje' | 'criticos'

const STAGE_ORDER: { key: EtapaPipeline; label: string }[] = [
  { key: 'cadastro', label: 'Cadastro' },
  { key: 'documentos', label: 'Documentos' },
  { key: 'pecas', label: 'Gerar Peças' },
  { key: 'prazos', label: 'Prazos' },
  { key: 'revisao', label: 'Revisão' },
  { key: 'encerramento', label: 'Encerramento' },
]

const PROXIMA_ACAO: Record<EtapaPipeline, string> = {
  cadastro: 'Completar cadastro',
  documentos: 'Anexar documentos',
  pecas: 'Gerar peça',
  prazos: 'Cadastrar prazo',
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

function isToday(dateStr: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0)
  return d.getTime() === today.getTime()
}

function isThisWeek(dateStr: string) {
  const days = Math.floor((new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000)
  return days >= 0 && days <= 7
}

export function AgendaPage() {
  const [tab, setTab] = useState<Tab>('todos')
  const [search, setSearch] = useState('')

  const { data: deadlines = [] } = useQuery({ queryKey: ['deadlines'], queryFn: deadlinesService.list })
  const { data: cases = [] } = useQuery({ queryKey: ['cases'], queryFn: () => casesService.list() })

  const pending = deadlines.filter((d) => !d.completed)
  const criticos = pending.filter((d) => d.priority === 'critical').length
  const hoje = pending.filter((d) => isToday(d.dueDate)).length
  const semana = pending.filter((d) => isThisWeek(d.dueDate)).length
  const concluidos = deadlines.filter((d) => d.completed).length

  const rows = useMemo(() => {
    let list = [...deadlines].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    if (tab === 'hoje') list = list.filter((d) => !d.completed && isToday(d.dueDate))
    if (tab === 'criticos') list = list.filter((d) => !d.completed && d.priority === 'critical')
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((d) =>
        d.title.toLowerCase().includes(q) || d.caseTitle.toLowerCase().includes(q),
      )
    }
    return list
  }, [deadlines, tab, search])

  function statusFor(d: Deadline) {
    if (d.completed) return { label: 'CONCLUÍDO', cls: 'status-done' }
    if (d.priority === 'critical') return { label: 'CRÍTICO', cls: 'status-critical' }
    if (isToday(d.dueDate)) return { label: 'HOJE', cls: 'status-today' }
    if (isThisWeek(d.dueDate)) return { label: 'SEMANA', cls: 'status-week' }
    return { label: 'NORMAL', cls: 'status-normal' }
  }

  return (
    <div className="prazos-page">
      <div className="prazos-page-header">
        <div>
          <h1>Prazos</h1>
          <p>Toda a execução jurídica organizada por prioridade operacional.</p>
        </div>
        <label className="cases-search" style={{ maxWidth: 260 }}>
          <Search size={14} />
          <input type="text" placeholder="Pesquisar..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <nav className="pill-tabs">
          {(['todos', 'hoje', 'criticos'] as Tab[]).map((t) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {t === 'todos' ? 'Todos' : t === 'hoje' ? 'Hoje' : 'Críticos'}
            </button>
          ))}
        </nav>
      </div>

      <div className="prazos-stat-row">
        <div className="prazos-stat">
          <span>EXECUÇÕES CRÍTICAS</span>
          <strong className="danger">{criticos}</strong>
        </div>
        <div className="prazos-stat">
          <span>HOJE</span>
          <strong>{hoje}</strong>
        </div>
        <div className="prazos-stat">
          <span>ESTA SEMANA</span>
          <strong>{semana}</strong>
        </div>
        <div className="prazos-stat">
          <span>CONCLUÍDOS</span>
          <strong className="success">{concluidos}</strong>
        </div>
      </div>

      <div className="prazos-table">
        <div className="prazos-table-head">
          <span>Caso / Fluxo de Execução</span>
          <span>Fase</span>
          <span>Prazo Limite</span>
          <span>Próxima Ação</span>
          <span>Responsável</span>
          <span>Status</span>
        </div>
        <div className="prazos-table-body">
          {rows.length === 0 && (
            <div className="panel-empty">
              <CheckCircle2 size={26} />
              <span>Nenhum prazo encontrado.</span>
            </div>
          )}
          {rows.map((d) => {
            const c = cases.find((x) => x.id === d.caseId)
            const idx = c ? stageIndex(c.etapaAtual) : 0
            const acao = c ? PROXIMA_ACAO[c.etapaAtual] ?? PROXIMA_ACAO.cadastro : '—'
            const status = statusFor(d)
            const overdue = !d.completed && new Date(d.dueDate) < new Date(new Date().setHours(0, 0, 0, 0))
            return (
              <Link key={d.id} to={`/cases/${d.caseId}`} className="prazos-table-row">
                <div className="prazos-case-cell">
                  <strong>{c?.title || d.caseTitle}</strong>
                  <div className="case-card-stepper" style={{ marginTop: 6, borderBottom: 'none', paddingBottom: 0 }}>
                    {STAGE_ORDER.map((stage, i) => (
                      <div key={stage.key} className={`cc-step ${i < idx ? 'done' : ''} ${i === idx ? 'active' : ''}`} title={stage.label}>
                        <span className="cc-step-dot" style={{ width: 8, height: 8 }} />
                      </div>
                    ))}
                  </div>
                </div>
                <span className="muted">{d.title}</span>
                <span className={overdue ? 'prazos-deadline overdue' : 'prazos-deadline'}>
                  {overdue && <AlertTriangle size={13} />} {d.completed ? 'Concluído' : formatDate(d.dueDate)}
                </span>
                <span className="muted">{acao}</span>
                <span className="muted">{d.responsavel || '—'}</span>
                <span className={`prazos-status-badge ${status.cls}`}>{status.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
