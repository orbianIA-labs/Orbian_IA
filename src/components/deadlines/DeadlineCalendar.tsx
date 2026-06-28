import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Deadline } from '@/types/domain.types'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

type Props = {
  deadlines: Deadline[]
  onSelect?: (deadline: Deadline) => void
}

export function DeadlineCalendar({ deadlines, onSelect }: Props) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const byDay = useMemo(() => {
    const map = new Map<string, Deadline[]>()
    for (const d of deadlines) {
      const date = new Date(d.dueDate)
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      const arr = map.get(key) ?? []
      arr.push(d)
      map.set(key, arr)
    }
    return map
  }, [deadlines])

  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay()
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
  const today = new Date()

  const cells: (number | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const move = (delta: number) => {
    setCursor((c) => {
      const m = c.month + delta
      if (m < 0) return { year: c.year - 1, month: 11 }
      if (m > 11) return { year: c.year + 1, month: 0 }
      return { year: c.year, month: m }
    })
  }

  return (
    <div className="calendar">
      <header className="calendar-header">
        <button onClick={() => move(-1)} aria-label="Mês anterior">
          <ChevronLeft size={18} />
        </button>
        <strong>
          {MONTHS[cursor.month]} {cursor.year}
        </strong>
        <button onClick={() => move(1)} aria-label="Próximo mês">
          <ChevronRight size={18} />
        </button>
      </header>

      <div className="calendar-grid calendar-weekdays">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div className="calendar-grid">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="calendar-cell empty" />
          const key = `${cursor.year}-${cursor.month}-${day}`
          const items = byDay.get(key) ?? []
          const isToday =
            today.getFullYear() === cursor.year &&
            today.getMonth() === cursor.month &&
            today.getDate() === day
          return (
            <div key={key} className={`calendar-cell${isToday ? ' today' : ''}`}>
              <span className="calendar-day-num">{day}</span>
              {items.map((d) => (
                <button
                  key={d.id}
                  className={`calendar-event ${d.priority}${d.completed ? ' done' : ''}`}
                  onClick={() => onSelect?.(d)}
                  title={d.title}
                >
                  {d.title}
                </button>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
