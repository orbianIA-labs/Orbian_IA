import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, CheckCircle2, Pencil, Trash2 } from 'lucide-react'
import { prazosService, type Prazo, type PrazoStatus } from '@/services/prazos.service'
import { formatDate } from '@/lib/utils'

const FILTROS: { key: 'todos' | PrazoStatus; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'urgente', label: 'Urgentes' },
  { key: 'atencao', label: 'Atenção' },
  { key: 'seguro', label: 'Em dia' },
  { key: 'concluido', label: 'Concluídos' },
]

export function PrazosPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [filtro, setFiltro] = useState<'todos' | PrazoStatus>('todos')

  const { data: prazos = [], isLoading } = useQuery({
    queryKey: ['prazos-todos'],
    queryFn: () => prazosService.listAll(),
  })

  const concluir = useMutation({
    mutationFn: (p: Prazo) => prazosService.update(p.id, { concluido: !p.concluido }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prazos-todos'] }),
  })

  const remover = useMutation({
    mutationFn: (id: string) => prazosService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prazos-todos'] }),
  })

  const prazosOrdenados = [...prazos].sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime())
  const exibidos = filtro === 'todos'
    ? prazosOrdenados
    : filtro === 'concluido'
      ? prazosOrdenados.filter((p) => p.concluido)
      : prazosOrdenados.filter((p) => !p.concluido && p.status === filtro)

  const contagem = (key: 'todos' | PrazoStatus) =>
    key === 'todos' ? prazos.length : key === 'concluido' ? prazos.filter((p) => p.concluido).length : prazos.filter((p) => !p.concluido && p.status === key).length

  return (
    <div className="cases-page">
      <div className="cases-page-header">
        <div>
          <h1>Prazos</h1>
          <p>{prazos.length} prazo{prazos.length !== 1 ? 's' : ''} · em todos os casos</p>
        </div>
      </div>

      <div className="doc-tabs" style={{ margin: '0 0 16px' }}>
        {FILTROS.map((f) => (
          <button key={f.key} className={filtro === f.key ? 'active' : ''} onClick={() => setFiltro(f.key)}>
            {f.label} ({contagem(f.key)})
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="cases-grid-loading">Carregando...</p>
      ) : exibidos.length === 0 ? (
        <div className="panel-empty">
          <CalendarClock size={26} />
          <span>Nenhum prazo nessa categoria.</span>
        </div>
      ) : (
        <ul className="case-prazo-list">
          {exibidos.map((p) => (
            <li key={p.id} className={`case-prazo-row status-${p.status}`}>
              <div style={{ cursor: 'pointer' }} onClick={() => navigate(`/cases/${p.casoId}?view=prazos`)}>
                <strong className={p.concluido ? 'strike' : ''}>{p.titulo}</strong>
                <span>
                  {formatDate(p.dataVencimento)}
                  {p.responsavel ? ` · ${p.responsavel}` : ''}
                  {p.casoNumeroProcesso ? ` · ${p.casoNumeroProcesso}` : ''}
                </span>
              </div>
              <div className="case-prazo-actions">
                <span className={`case-prazo-badge ${p.status}`}>{p.concluido ? 'Concluído' : `${p.diasUteisRestantes}d úteis`}</span>
                <button className="case-icon-btn" title={p.concluido ? 'Reabrir' : 'Concluir'} onClick={() => concluir.mutate(p)}>
                  <CheckCircle2 size={14} />
                </button>
                <button className="case-icon-btn" title="Ver no caso" onClick={() => navigate(`/cases/${p.casoId}?view=prazos`)}>
                  <Pencil size={14} />
                </button>
                <button className="case-icon-btn" title="Remover" onClick={() => remover.mutate(p.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
