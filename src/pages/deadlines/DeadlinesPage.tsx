import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Bell, CalendarDays, Check, Clock, List, Pencil, Plus, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { DeadlineCalendar } from '@/components/deadlines/DeadlineCalendar'
import { formatDate } from '@/lib/utils'
import { casesService } from '@/services/cases.service'
import { deadlinesService } from '@/services/deadlines.service'
import type { Deadline, DeadlinePriority } from '@/types/domain.types'

const PRIORITY_BADGE: Record<DeadlinePriority, { label: string; cls: string }> = {
  critical: { label: 'Crítico', cls: 'badge-critical' },
  attention: { label: 'Alto', cls: 'badge-warning' },
  normal: { label: 'Médio', cls: 'badge-info' },
}

const emptyForm = {
  id: '',
  casoId: '',
  titulo: '',
  dataVencimento: '',
  responsavel: '',
  observacoes: '',
}

function daysFromToday(dateStr: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0)
  return Math.floor((d.getTime() - today.getTime()) / 86400000)
}

function hhmm(dateStr: string) {
  const d = new Date(dateStr)
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0
  return hasTime ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null
}

export function DeadlinesPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [reminderMsg, setReminderMsg] = useState<string | null>(null)

  const { data: deadlines = [], isLoading } = useQuery({
    queryKey: ['deadlines'],
    queryFn: deadlinesService.list,
  })

  const { data: cases = [] } = useQuery({
    queryKey: ['cases'],
    queryFn: () => casesService.list(),
  })

  const salvar = useMutation({
    mutationFn: () =>
      form.id
        ? deadlinesService.update(form.id, {
            titulo: form.titulo,
            dataVencimento: form.dataVencimento,
            responsavel: form.responsavel,
            observacoes: form.observacoes,
          })
        : deadlinesService.create({
            casoId: form.casoId,
            titulo: form.titulo,
            dataVencimento: form.dataVencimento,
            responsavel: form.responsavel || undefined,
            observacoes: form.observacoes || undefined,
          }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deadlines'] })
      setShowForm(false)
      setForm(emptyForm)
    },
  })

  const concluir = useMutation({
    mutationFn: (id: string) => deadlinesService.complete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deadlines'] }),
  })

  const excluir = useMutation({
    mutationFn: (id: string) => deadlinesService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deadlines'] }),
  })

  const lembretes = useMutation({
    mutationFn: () => deadlinesService.sendReminders(),
    onSuccess: (res) => setReminderMsg(res.mensagem),
    onError: () => setReminderMsg('Não foi possível enviar (verifique a configuração do Resend).'),
  })

  function openNew() {
    setForm(emptyForm)
    setShowForm(true)
  }

  function openEdit(d: Deadline) {
    setForm({
      id: d.id,
      casoId: d.caseId,
      titulo: d.title,
      dataVencimento: d.dueDate.slice(0, 10),
      responsavel: d.responsavel,
      observacoes: d.observacoes,
    })
    setShowForm(true)
  }

  const pendentes = deadlines.filter((d) => !d.completed)
  const concluidos = deadlines.filter((d) => d.completed)

  const groups = useMemo(() => {
    const sorted = [...pendentes].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    const atrasados = sorted.filter((d) => daysFromToday(d.dueDate) < 0)
    const hoje = sorted.filter((d) => daysFromToday(d.dueDate) === 0)
    const semana = sorted.filter((d) => { const n = daysFromToday(d.dueDate); return n >= 1 && n <= 7 })
    const mes = sorted.filter((d) => { const n = daysFromToday(d.dueDate); return n >= 8 && n <= 30 })
    const adiante = sorted.filter((d) => daysFromToday(d.dueDate) > 30)
    return [
      { key: 'atrasados', label: 'Atrasados', items: atrasados },
      { key: 'hoje', label: 'Hoje', items: hoje },
      { key: 'semana', label: 'Próximos 7 dias', items: semana },
      { key: 'mes', label: 'Próximos 30 dias', items: mes },
      { key: 'adiante', label: 'Mais adiante', items: adiante },
    ].filter((g) => g.items.length > 0)
  }, [pendentes])

  return (
    <div className="page-stack deadlines-page">
      <section className="page-heading compact">
        <div>
          <h1>Prazos</h1>
          <p className="deadlines-subtitle">Central inteligente · organizados por urgência</p>
        </div>
        <div className="button-row" style={{ margin: 0 }}>
          <div className="segmented">
            <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>
              <List size={15} /> Lista
            </button>
            <button className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>
              <CalendarDays size={15} /> Calendário
            </button>
          </div>
          <Button variant="secondary" onClick={() => lembretes.mutate()} disabled={lembretes.isPending}>
            <Bell size={17} />
            {lembretes.isPending ? 'Enviando...' : 'Enviar lembretes'}
          </Button>
          <Button onClick={openNew}>
            <Plus size={18} />
            Novo prazo
          </Button>
        </div>
      </section>

      {reminderMsg && <p style={{ fontSize: 13, color: 'var(--muted)' }}>{reminderMsg}</p>}

      {showForm && (
        <article className="panel">
          <h2>{form.id ? 'Editar prazo' : 'Novo prazo'}</h2>
          <div className="form-stack">
            {!form.id && (
              <label>
                <span>Caso</span>
                <select
                  value={form.casoId}
                  onChange={(e) => setForm({ ...form, casoId: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', fontSize: 14 }}
                >
                  <option value="">Selecione um caso...</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.clientName} {c.caseNumber ? `— ${c.caseNumber}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              <span>Título do prazo</span>
              <input
                type="text"
                placeholder="Ex.: Protocolar contestação"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              />
            </label>
            <label>
              <span>Data de vencimento</span>
              <input
                type="date"
                value={form.dataVencimento}
                onChange={(e) => setForm({ ...form, dataVencimento: e.target.value })}
              />
            </label>
            <label>
              <span>Responsável (opcional)</span>
              <input
                type="text"
                placeholder="Ex.: Dr. João"
                value={form.responsavel}
                onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
              />
            </label>
            <label>
              <span>Observações (opcional)</span>
              <textarea
                rows={2}
                placeholder="Detalhes do prazo..."
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                style={{ resize: 'vertical' }}
              />
            </label>
            <div className="button-row">
              <Button
                onClick={() => salvar.mutate()}
                disabled={(!form.id && !form.casoId) || !form.titulo || !form.dataVencimento || salvar.isPending}
              >
                {salvar.isPending ? 'Salvando...' : 'Salvar prazo'}
              </Button>
              <Button variant="secondary" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
            {salvar.isError && <p style={{ color: 'var(--danger)', fontSize: 13 }}>Erro ao salvar prazo.</p>}
          </div>
        </article>
      )}

      {isLoading && <p style={{ color: 'var(--muted)', padding: '1rem' }}>Carregando...</p>}

      {!isLoading && view === 'calendar' && (
        <DeadlineCalendar deadlines={deadlines} onSelect={openEdit} />
      )}

      {!isLoading && view === 'list' && (
        <div className="deadlines-scroll">
          {pendentes.length === 0 && concluidos.length === 0 && (
            <div className="panel-empty">
              <CalendarDays size={26} />
              <span>Nenhum prazo cadastrado.</span>
            </div>
          )}

          <div className="deadlines-columns">
            {groups.map((group) => (
              <section className="deadlines-group" key={group.key}>
                <div className="deadlines-group-head">
                  <h3>{group.label}</h3>
                  <span className="deadlines-group-count">{group.items.length}</span>
                </div>
                <div className="deadlines-group-list">
                  {group.items.map((d) => {
                    const c = cases.find((x) => x.id === d.caseId)
                    const badge = PRIORITY_BADGE[d.priority]
                    const time = hhmm(d.dueDate)
                    const overdue = group.key === 'atrasados'
                    return (
                      <article className="deadline-item" key={d.id}>
                        <div className="deadline-item-top">
                          <strong>{d.title}</strong>
                          <span className={`badge ${overdue ? 'badge-critical' : badge.cls}`}>
                            {overdue && <AlertTriangle size={12} />}
                            {overdue ? 'Atrasado' : badge.label}
                          </span>
                        </div>
                        <p className="deadline-item-client">{c?.title || d.caseTitle}</p>
                        <p className="deadline-item-date">
                          <Clock size={12} /> {formatDate(d.dueDate)}{time ? ` · ${time}` : ''}
                        </p>
                        <button className="deadline-item-cta" onClick={() => navigate(`/cases/${d.caseId}`)}>
                          <ArrowRight size={14} /> Executar
                        </button>
                        <div className="deadline-item-icons">
                          <button className="icon-btn" title="Concluir" onClick={() => concluir.mutate(d.id)}>
                            <Check size={13} />
                          </button>
                          <button className="icon-btn" title="Editar" onClick={() => openEdit(d)}>
                            <Pencil size={13} />
                          </button>
                          <button className="icon-btn danger" title="Excluir" onClick={() => excluir.mutate(d.id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>

          {concluidos.length > 0 && (
            <section className="deadlines-group deadlines-group-done">
              <div className="deadlines-group-head">
                <h3>Concluídos</h3>
                <span className="deadlines-group-count">{concluidos.length}</span>
              </div>
              <div className="deadlines-group-list">
                {concluidos.map((d) => (
                  <Link to={`/cases/${d.caseId}`} className="deadline-item done" key={d.id}>
                    <div className="deadline-item-top">
                      <strong>{d.title}</strong>
                      <span className="badge badge-success">Concluído</span>
                    </div>
                    <div className="deadline-item-bottom">
                      <span className="deadline-item-client">{d.caseTitle}</span>
                      <span className="deadline-item-date">{formatDate(d.dueDate)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
