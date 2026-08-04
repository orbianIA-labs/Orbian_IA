import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, CalendarClock } from 'lucide-react'
import { prazosService } from '@/services/prazos.service'
import { formatDate } from '@/lib/utils'

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function chaveDia(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export function PrazosCalendar() {
  const navigate = useNavigate()
  const [mesRef, setMesRef] = useState(() => new Date())

  const { data: prazos = [] } = useQuery({
    queryKey: ['prazos-todos'],
    queryFn: () => prazosService.listAll(),
  })

  const prazosPorDia = useMemo(() => {
    const mapa = new Map<string, typeof prazos>()
    for (const p of prazos) {
      const chave = chaveDia(new Date(p.dataVencimento))
      mapa.set(chave, [...(mapa.get(chave) ?? []), p])
    }
    return mapa
  }, [prazos])

  const proximosPrazos = useMemo(() => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    return prazos
      .filter((p) => !p.concluido && new Date(p.dataVencimento) >= hoje)
      .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime())
      .slice(0, 4)
  }, [prazos])

  const ano = mesRef.getFullYear()
  const mes = mesRef.getMonth()
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay()
  const totalDias = new Date(ano, mes + 1, 0).getDate()
  const hoje = new Date()

  const celulas: (Date | null)[] = [
    ...Array(primeiroDiaSemana).fill(null),
    ...Array.from({ length: totalDias }, (_, i) => new Date(ano, mes, i + 1)),
  ]

  return (
    <div className="panel prazos-calendar">
      <div className="section-head" style={{ marginBottom: 10 }}>
        <div className="section-head-left">
          <span className="section-icon"><CalendarClock size={13} /></span>
          <h3 className="section-title">Calendário de Prazos</h3>
        </div>
        <div className="prazos-calendar-nav">
          <button aria-label="Mês anterior" onClick={() => setMesRef(new Date(ano, mes - 1, 1))}><ChevronLeft size={14} /></button>
          <span>{MESES[mes]} {ano}</span>
          <button aria-label="Próximo mês" onClick={() => setMesRef(new Date(ano, mes + 1, 1))}><ChevronRight size={14} /></button>
        </div>
      </div>

      <div className="prazos-calendar-grid">
        {DIAS_SEMANA.map((d, i) => <span key={i} className="prazos-calendar-weekday">{d}</span>)}
        {celulas.map((d, i) => {
          if (!d) return <span key={i} className="prazos-calendar-cell empty" />
          const itens = prazosPorDia.get(chaveDia(d)) ?? []
          const pendentes = itens.filter((p) => !p.concluido)
          const isHoje = d.toDateString() === hoje.toDateString()
          return (
            <button
              key={i}
              className={`prazos-calendar-cell ${isHoje ? 'today' : ''} ${pendentes.length > 0 ? 'has-prazo' : ''}`}
              title={itens.map((p) => p.titulo).join(', ') || undefined}
              onClick={() => { if (itens[0]) navigate(`/cases/${itens[0].casoId}?view=prazos`) }}
              disabled={itens.length === 0}
            >
              {d.getDate()}
              {pendentes.length > 0 && <span className="prazos-calendar-dot" />}
            </button>
          )
        })}
      </div>

      <div className="prazos-calendar-list">
        <p className="section-label" style={{ margin: '10px 0 6px' }}>PRÓXIMOS PRAZOS</p>
        {proximosPrazos.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>Nenhum prazo pendente.</p>
        ) : (
          proximosPrazos.map((p) => (
            <button key={p.id} className="prazos-calendar-item" onClick={() => navigate(`/cases/${p.casoId}?view=prazos`)}>
              <span className={`prazos-calendar-item-dot status-${p.status}`} />
              <span className="prazos-calendar-item-title">{p.titulo}</span>
              <span className="prazos-calendar-item-date">{formatDate(p.dataVencimento)}</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
