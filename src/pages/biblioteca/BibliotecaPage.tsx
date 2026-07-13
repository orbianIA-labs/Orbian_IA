import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, FileText, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { areaLabel } from '@/lib/utils'
import api from '@/lib/axios'

interface Template {
  id: string
  categoria: string
  titulo: string
  tags: string[]
  area?: string
  versao?: number
  updatedAt?: string
}

const AREA_FILTROS = ['Todos', 'civil', 'trabalhista', 'tributario', 'penal', 'familia', 'consumidor'] as const
type AreaFiltro = (typeof AREA_FILTROS)[number]

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

export function BibliotecaPage() {
  const [areaFilter, setAreaFilter] = useState<AreaFiltro>('Todos')

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ['templates-all'],
    queryFn: () => api.get('/api/templates').then((r) => r.data),
  })

  const displayed = templates.filter((t) => areaFilter === 'Todos' || t.area === areaFilter)

  const porCategoria = useMemo(() => {
    const counts = new Map<string, number>()
    for (const t of templates) counts.set(t.categoria, (counts.get(t.categoria) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [templates])

  const maxCategoria = Math.max(1, ...porCategoria.map(([, n]) => n))

  return (
    <div className="biblioteca-page">
      <div className="biblioteca-page-header">
        <div>
          <h1>Biblioteca</h1>
          <p>Modelos de referência que aceleram a geração de peças com IA.</p>
        </div>
        <Button>
          <Plus size={16} /> Nova peça base
        </Button>
      </div>

      <div className="biblioteca-stat-row">
        <div className="prazos-stat">
          <span>MODELOS JURÍDICOS</span>
          <strong>{templates.length}</strong>
        </div>
        <div className="prazos-stat">
          <span>ÁREAS COBERTAS</span>
          <strong>{new Set(templates.map((t) => t.area).filter(Boolean)).size}</strong>
        </div>
        <div className="prazos-stat">
          <span>ATUALIZADOS (30D)</span>
          <strong>{templates.filter((t) => t.updatedAt && Date.now() - new Date(t.updatedAt).getTime() < 30 * 86400000).length}</strong>
        </div>
      </div>

      <nav className="pill-tabs">
        {AREA_FILTROS.map((a) => (
          <button key={a} className={areaFilter === a ? 'active' : ''} onClick={() => setAreaFilter(a)}>
            {a === 'Todos' ? 'Todos' : areaLabel(a)}
          </button>
        ))}
      </nav>

      <div className="biblioteca-body">
        <div className="biblioteca-cards">
          {isLoading && <p style={{ color: 'var(--muted)', padding: '1rem' }}>Carregando modelos...</p>}

          {!isLoading && displayed.length === 0 && (
            <div className="empty-state">
              <BookOpen size={40} style={{ opacity: 0.3 }} />
              <h3>Nenhum modelo encontrado</h3>
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>Crie modelos de referência para acelerar a geração de peças.</p>
              <Button>
                <Plus size={15} /> Nova peça base
              </Button>
            </div>
          )}

          {displayed.map((t) => (
            <div key={t.id} className="biblioteca-card">
              <span className="biblioteca-card-icon"><FileText size={18} /></span>
              <div className="biblioteca-card-body">
                <strong>{t.titulo}</strong>
                <div className="biblioteca-card-meta">
                  <span>{t.categoria}</span>
                  <span>·</span>
                  <span>Atualizado {formatDate(t.updatedAt)}</span>
                  <span>·</span>
                  <span>v{t.versao ?? 1}</span>
                </div>
                <div className="biblioteca-card-tags">
                  {t.area && <span className="biblioteca-area-chip">{areaLabel(t.area)}</span>}
                  {t.tags?.slice(0, 3).map((tag) => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
              <Button variant="secondary" style={{ fontSize: 12, padding: '5px 12px', flexShrink: 0 }}>
                <Pencil size={13} /> Editar
              </Button>
            </div>
          ))}
        </div>

        <aside className="panel biblioteca-side">
          <p className="section-label" style={{ marginBottom: 14 }}>MODELOS POR CATEGORIA</p>
          {porCategoria.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>Nenhum modelo cadastrado ainda.</p>
          ) : (
            <div className="biblioteca-cat-bars">
              {porCategoria.map(([cat, count]) => (
                <div key={cat} className="biblioteca-cat-bar-row">
                  <span className="biblioteca-cat-label">{cat}</span>
                  <div className="biblioteca-cat-track">
                    <div className="biblioteca-cat-fill" style={{ width: `${(count / maxCategoria) * 100}%` }} />
                  </div>
                  <span className="biblioteca-cat-count">{count}</span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
