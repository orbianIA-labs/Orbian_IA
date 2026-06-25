import { useState } from 'react'
import { CalendarDays, Plus } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import { casesService } from '@/services/cases.service'
import { deadlinesService } from '@/services/deadlines.service'

export function DeadlinesPage() {
  const qc = useQueryClient()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [casoId, setCasoId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [dataVencimento, setDataVencimento] = useState('')

  const { data: deadlines = [], isLoading } = useQuery({
    queryKey: ['deadlines'],
    queryFn: deadlinesService.list,
  })

  const { data: cases = [] } = useQuery({
    queryKey: ['cases'],
    queryFn: casesService.list,
  })

  const criar = useMutation({
    mutationFn: () =>
      deadlinesService.create({ casoId, titulo, dataVencimento }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deadlines'] })
      setMostrarForm(false)
      setCasoId('')
      setTitulo('')
      setDataVencimento('')
    },
  })

  const concluir = useMutation({
    mutationFn: (id: string) => deadlinesService.complete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deadlines'] }),
  })

  const pendentes = deadlines.filter((d) => !d.completed)
  const concluidos = deadlines.filter((d) => d.completed)

  return (
    <div className="page-stack">
      <section className="page-heading compact">
        <div>
          <p className="eyebrow">Pilar 2</p>
          <h1>Controle de prazos</h1>
        </div>
        <Button onClick={() => setMostrarForm(true)}>
          <Plus size={18} />
          Novo prazo
        </Button>
      </section>

      {mostrarForm && (
        <article className="panel">
          <h2>Novo prazo</h2>
          <div className="form-stack">
            <label>
              <span>Caso</span>
              <select
                value={casoId}
                onChange={(e) => setCasoId(e.target.value)}
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
            <label>
              <span>Título do prazo</span>
              <input
                type="text"
                placeholder="Ex.: Protocolar contestação"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </label>
            <label>
              <span>Data de vencimento</span>
              <input
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
              />
            </label>
            <div className="button-row">
              <Button
                onClick={() => criar.mutate()}
                disabled={!casoId || !titulo || !dataVencimento || criar.isPending}
              >
                {criar.isPending ? 'Salvando...' : 'Salvar prazo'}
              </Button>
              <Button variant="secondary" onClick={() => setMostrarForm(false)}>
                Cancelar
              </Button>
            </div>
            {criar.isError && (
              <p style={{ color: 'var(--danger)', fontSize: 13 }}>Erro ao salvar prazo.</p>
            )}
          </div>
        </article>
      )}

      {isLoading && <p style={{ color: 'var(--text-2)', padding: '1rem' }}>Carregando...</p>}

      {!isLoading && deadlines.length === 0 && (
        <p style={{ color: 'var(--text-2)', padding: '1rem', textAlign: 'center' }}>
          Nenhum prazo cadastrado.
        </p>
      )}

      <section className="deadline-board">
        {pendentes.map((deadline) => (
          <article
            className={`deadline-card ${deadline.priority}`}
            key={deadline.id}
            style={{ cursor: 'pointer' }}
            onClick={() => concluir.mutate(deadline.id)}
            title="Clique para marcar como concluído"
          >
            <CalendarDays size={20} />
            <div>
              <h2>{deadline.title}</h2>
              <p>{deadline.caseTitle}</p>
              <strong>{deadline.businessDaysLeft} dias úteis restantes</strong>
            </div>
            <time>{formatDate(deadline.dueDate)}</time>
          </article>
        ))}
        {concluidos.map((deadline) => (
          <article
            className="deadline-card"
            key={deadline.id}
            style={{ opacity: 0.5 }}
          >
            <CalendarDays size={20} />
            <div>
              <h2 style={{ textDecoration: 'line-through' }}>{deadline.title}</h2>
              <p>{deadline.caseTitle}</p>
              <strong>Concluído</strong>
            </div>
            <time>{formatDate(deadline.dueDate)}</time>
          </article>
        ))}
      </section>
    </div>
  )
}
