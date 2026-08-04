import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bell, CalendarClock } from 'lucide-react'
import { prazosService, type Prazo } from '@/services/prazos.service'
import { formatDate } from '@/lib/utils'

/** Quanto falta pro prazo, em dias úteis (o backend já calcula descontando
 *  fins de semana e feriados). */
function diasUteis(n: number) {
  return n === 1 ? '1 dia útil' : `${n} dias úteis`
}

function prazoLabel(p: Prazo) {
  const d = p.diasUteisRestantes
  if (d < 0) return `Venceu há ${diasUteis(Math.abs(d))}`
  if (d === 0) return 'Vence hoje'
  return `Vence em ${diasUteis(d)}`
}

/** Sino da topbar: avisa sobre prazos vencidos ou perto do vencimento.
 *  O ponto vermelho só aparece quando existe algo de verdade pra ver. */
export function NotificationsBell() {
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const { data: prazos = [] } = useQuery({
    queryKey: ['prazos-todos'],
    queryFn: () => prazosService.listAll(),
  })

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // Só entra no sino o que exige ação: vencido, vencendo hoje ou em alerta.
  const alertas = prazos
    .filter((p) => !p.concluido && (p.status === 'urgente' || p.status === 'atencao' || p.diasUteisRestantes <= 0))
    .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime())

  function abrirPrazo(p: Prazo) {
    setAberto(false)
    navigate(`/cases/${p.casoId}?view=prazos`)
  }

  return (
    <div className="topbar-icon-user" style={{ position: 'relative' }} ref={wrapperRef}>
      <button
        className="bell-btn"
        aria-label={alertas.length > 0 ? `Notificações (${alertas.length})` : 'Notificações'}
        onClick={() => setAberto((v) => !v)}
      >
        <Bell size={18} />
        {alertas.length > 0 && <span className="bell-dot" />}
      </button>

      {aberto && (
        <div className="user-dropdown notif-dropdown">
          <p className="notif-head">
            PRAZOS
            {alertas.length > 0 && <span className="notif-count">{alertas.length}</span>}
          </p>

          {alertas.length === 0 ? (
            <p className="notif-empty">Nenhum prazo próximo do vencimento.</p>
          ) : (
            alertas.slice(0, 6).map((p) => (
              <button key={p.id} className="notif-item" onClick={() => abrirPrazo(p)}>
                <span className={`notif-item-icon status-${p.diasUteisRestantes <= 0 ? 'urgente' : p.status}`}>
                  <CalendarClock size={14} />
                </span>
                <span className="notif-item-body">
                  <strong>{p.titulo}</strong>
                  <span>{prazoLabel(p)} · {formatDate(p.dataVencimento)}</span>
                </span>
              </button>
            ))
          )}

          {alertas.length > 6 && (
            <p className="notif-empty">+{alertas.length - 6} outros prazos em alerta.</p>
          )}
        </div>
      )}
    </div>
  )
}
