import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { deadlinesService } from '@/services/deadlines.service'
import { casesService } from '@/services/cases.service'
import type { Deadline } from '@/types/domain.types'

type View = 'hoje' | 'semana' | 'mes'

const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function AgendaPage() {
  const [view, setView] = useState<View>('hoje')
  const [refDate, setRefDate] = useState(new Date())

  const { data: deadlines = [] } = useQuery({ queryKey: ['deadlines'], queryFn: deadlinesService.list })
  const { data: cases = [] } = useQuery({ queryKey: ['cases'], queryFn: () => casesService.list() })

  const pending = deadlines.filter((d) => !d.completed)

  function deadlinesForDay(day: Date): Deadline[] {
    return pending.filter((d) => isSameDay(new Date(d.dueDate), day))
  }

  function prevPeriod() {
    const d = new Date(refDate)
    if (view === 'hoje') d.setDate(d.getDate() - 1)
    else if (view === 'semana') d.setDate(d.getDate() - 7)
    else d.setMonth(d.getMonth() - 1)
    setRefDate(d)
  }

  function nextPeriod() {
    const d = new Date(refDate)
    if (view === 'hoje') d.setDate(d.getDate() + 1)
    else if (view === 'semana') d.setDate(d.getDate() + 7)
    else d.setMonth(d.getMonth() + 1)
    setRefDate(d)
  }

  function goToday() { setRefDate(new Date()) }

  // Week start (Monday)
  function weekStart(d: Date) {
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const start = new Date(d)
    start.setDate(d.getDate() + diff)
    start.setHours(0, 0, 0, 0)
    return start
  }

  const wStart = weekStart(refDate)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(wStart)
    d.setDate(wStart.getDate() + i)
    return d
  })

  // Month grid
  const monthStart = new Date(refDate.getFullYear(), refDate.getMonth(), 1)
  const monthEnd = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0)
  const gridStart = new Date(monthStart)
  const dayOfWeek = monthStart.getDay()
  gridStart.setDate(monthStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  const gridDays: Date[] = []
  const cur = new Date(gridStart)
  while (cur <= monthEnd || gridDays.length % 7 !== 0) {
    gridDays.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
    if (gridDays.length > 42) break
  }

  const today = new Date()

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Orbian Agenda</p>
          <h1>Agenda</h1>
          <p>Seus prazos e execuções organizados por data</p>
        </div>
        <Link to="/cases/new">
          <Button>Novo caso</Button>
        </Link>
      </section>

      <div className="agenda-toolbar">
        <div className="segmented">
          {(['hoje', 'semana', 'mes'] as View[]).map((v) => (
            <button key={v} className={view === v ? 'active' : ''} onClick={() => setView(v)}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        <div className="agenda-nav">
          <button className="icon-btn" onClick={prevPeriod}><ChevronLeft size={18} /></button>
          <button className="agenda-today-btn" onClick={goToday}>Hoje</button>
          <button className="icon-btn" onClick={nextPeriod}><ChevronRight size={18} /></button>
          <span className="agenda-period-label">
            {view === 'mes'
              ? `${MONTHS_PT[refDate.getMonth()]} ${refDate.getFullYear()}`
              : view === 'semana'
              ? `${wStart.getDate()} – ${weekDays[6].getDate()} ${MONTHS_PT[weekDays[6].getMonth()]}`
              : refDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </span>
        </div>
      </div>

      {view === 'hoje' && (
        <div className="panel">
          <div className="panel-title">
            <h2>
              <CalendarDays size={17} style={{ display: 'inline', marginRight: 6, verticalAlign: -3 }} />
              {refDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </h2>
          </div>
          {deadlinesForDay(refDate).length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: 14, padding: '8px 0' }}>Nenhum prazo para este dia.</p>
          ) : (
            <div className="agenda-day-list">
              {deadlinesForDay(refDate).map((d) => {
                const c = cases.find((x) => x.id === d.caseId)
                return (
                  <Link key={d.id} to={`/cases/${d.caseId}`} className="agenda-event">
                    <div className={`agenda-event-dot ${d.priority}`} />
                    <div className="agenda-event-body">
                      <strong>{d.title}</strong>
                      <span>{c?.clientName ?? '—'}</span>
                    </div>
                    <span className={`badge badge-${d.priority === 'critical' ? 'critical' : d.priority === 'attention' ? 'attention' : 'normal'}`}>
                      {d.priority === 'critical' ? 'Urgente' : d.priority === 'attention' ? 'Atenção' : 'Normal'}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}

      {view === 'semana' && (
        <div className="semana-grid">
          {weekDays.map((day) => {
            const dayDeadlines = deadlinesForDay(day)
            const isToday = isSameDay(day, today)
            return (
              <div key={day.toISOString()} className={`semana-col ${isToday ? 'semana-col-today' : ''}`}>
                <div className="semana-col-header">
                  <span className="semana-weekday">{DAYS_PT[day.getDay()]}</span>
                  <span className={`semana-day-num ${isToday ? 'today' : ''}`}>{day.getDate()}</span>
                </div>
                <div className="semana-events">
                  {dayDeadlines.length === 0
                    ? <span className="semana-empty">—</span>
                    : dayDeadlines.map((d) => (
                        <Link key={d.id} to={`/cases/${d.caseId}`} className={`semana-event ${d.priority}`}>
                          {d.title}
                        </Link>
                      ))
                  }
                </div>
              </div>
            )
          })}
        </div>
      )}

      {view === 'mes' && (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="mes-grid-header">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
              <div key={d} className="mes-weekday">{d}</div>
            ))}
          </div>
          <div className="mes-grid">
            {gridDays.map((day) => {
              const isCurrentMonth = day.getMonth() === refDate.getMonth()
              const isToday = isSameDay(day, today)
              const dayDeadlines = deadlinesForDay(day)
              return (
                <div
                  key={day.toISOString()}
                  className={`mes-cell ${!isCurrentMonth ? 'mes-cell-outside' : ''} ${isToday ? 'mes-cell-today' : ''}`}
                >
                  <span className="mes-cell-num">{day.getDate()}</span>
                  {dayDeadlines.slice(0, 2).map((d) => (
                    <Link key={d.id} to={`/cases/${d.caseId}`} className={`mes-event ${d.priority}`}>
                      {d.title}
                    </Link>
                  ))}
                  {dayDeadlines.length > 2 && (
                    <span className="mes-more">+{dayDeadlines.length - 2} mais</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
