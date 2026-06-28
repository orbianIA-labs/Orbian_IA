import { useMemo, useState } from 'react'
import { Bell, CalendarDays, Check, List, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { DeadlineCalendar } from '@/components/deadlines/DeadlineCalendar'
import { formatDate } from '@/lib/utils'
import { casesService } from '@/services/cases.service'
import { deadlinesService } from '@/services/deadlines.service'
import type { Deadline, DeadlinePriority } from '@/types/domain.types'

const PRIORITY_LABEL: Record<DeadlinePriority, string> = {
  critical: 'Urgente',
  attention: 'Atenção',
  normal: 'Seguro',
}

const emptyForm = {
  id: '',
  casoId: '',
  titulo: '',
  dataVencimento: '',
  responsavel: '',
  observacoes: '',
}

export function DeadlinesPage() {
  const qc = useQueryClient()
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'all' | DeadlinePriority>('all')
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

  const filtered = useMemo(
    () => (filter === 'all' ? deadlines : deadlines.filter((d) => d.priority === filter)),
    [deadlines, filter],
  )
  const pendentes = filtered.filter((d) => !d.completed)
  const concluidos = filtered.filter((d) => d.completed)

  return (
    <div className="page-stack">
      <section className="page-heading compact">
        <div>
          <p className="eyebrow">Pilar 3</p>
          <h1>Controle de prazos</h1>
        </div>
        <div className="button-row" style={{ margin: 0 }}>
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

      {reminderMsg && <p style={{ fontSize: 13, color: 'var(--text-2)' }}>{reminderMsg}</p>}

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
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 14 }}
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

      <section className="toolbar">
        <div className="segmented">
          <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>
            <List size={15} /> Lista
          </button>
          <button className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>
            <CalendarDays size={15} /> Calendário
          </button>
        </div>
        {view === 'list' && (
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="all">Todas as urgências</option>
            <option value="critical">Urgente</option>
            <option value="attention">Atenção</option>
            <option value="normal">Seguro</option>
          </select>
        )}
      </section>

      {isLoading && <p style={{ color: 'var(--text-2)', padding: '1rem' }}>Carregando...</p>}

      {!isLoading && view === 'calendar' && (
        <DeadlineCalendar deadlines={deadlines} onSelect={openEdit} />
      )}

      {!isLoading && view === 'list' && (
        <>
          {filtered.length === 0 && (
            <p style={{ color: 'var(--text-2)', padding: '1rem', textAlign: 'center' }}>
              Nenhum prazo {filter !== 'all' ? 'nesta urgência' : 'cadastrado'}.
            </p>
          )}

          <section className="deadline-board">
            {pendentes.map((deadline) => (
              <article className={`deadline-card ${deadline.priority}`} key={deadline.id}>
                <CalendarDays size={20} />
                <div style={{ flex: 1 }}>
                  <h2>{deadline.title}</h2>
                  <p>{deadline.caseTitle}</p>
                  <strong>
                    {deadline.businessDaysLeft} dias úteis · {PRIORITY_LABEL[deadline.priority]}
                  </strong>
                  {deadline.responsavel && (
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--text-2)' }}>
                      Responsável: {deadline.responsavel}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <time>{formatDate(deadline.dueDate)}</time>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="icon-btn" title="Concluir" onClick={() => concluir.mutate(deadline.id)}>
                      <Check size={15} />
                    </button>
                    <button className="icon-btn" title="Editar" onClick={() => openEdit(deadline)}>
                      <Pencil size={15} />
                    </button>
                    <button className="icon-btn danger" title="Excluir" onClick={() => excluir.mutate(deadline.id)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {concluidos.map((deadline) => (
              <article className="deadline-card" key={deadline.id} style={{ opacity: 0.55 }}>
                <CalendarDays size={20} />
                <div style={{ flex: 1 }}>
                  <h2 style={{ textDecoration: 'line-through' }}>{deadline.title}</h2>
                  <p>{deadline.caseTitle}</p>
                  <strong>Concluído</strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <time>{formatDate(deadline.dueDate)}</time>
                  <button className="icon-btn danger" title="Excluir" onClick={() => excluir.mutate(deadline.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  )
}
