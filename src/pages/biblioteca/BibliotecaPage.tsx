import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, Pencil, Plus, Sparkles } from 'lucide-react'
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

export function BibliotecaPage() {
  const [areaFilter, setAreaFilter] = useState<AreaFiltro>('Todos')
  const [categoriaFilter, setCategoriaFilter] = useState('')

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ['templates-all'],
    queryFn: () => api.get('/api/templates').then((r) => r.data),
  })

  const CATEGORIAS = ['Contestação', 'Petição Inicial', 'Réplica', 'Manifestação', 'Embargos', 'Agravo', 'Apelação', 'Recurso', 'Mandado']

  const displayed = templates.filter((t) => {
    if (areaFilter !== 'Todos' && t.area !== areaFilter) return false
    if (categoriaFilter && t.categoria !== categoriaFilter) return false
    return true
  })

  function formatDate(iso?: string) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('pt-BR')
  }

  return (
    <div className="page-stack">
      <section className="page-heading compact">
        <div>
          <p className="eyebrow">Configurações</p>
          <h1>Biblioteca de Peças</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Modelos de referência para geração com IA</p>
        </div>
        <Button>
          <Plus size={16} /> Nova peça base
        </Button>
      </section>

      <div className="biblioteca-filters">
        <div className="filter-tabs" style={{ flex: 1 }}>
          {AREA_FILTROS.map((a) => (
            <button
              key={a}
              className={`filter-tab ${areaFilter === a ? 'active' : ''}`}
              onClick={() => setAreaFilter(a)}
            >
              {a === 'Todos' ? 'Todos' : areaLabel(a)}
            </button>
          ))}
        </div>
        <select
          value={categoriaFilter}
          onChange={(e) => setCategoriaFilter(e.target.value)}
          style={{ fontSize: 13, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--line)', color: 'var(--ink)' }}
        >
          <option value="">Todas as categorias</option>
          {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

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

      {displayed.length > 0 && (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="biblioteca-table-header">
            <span>Nome</span>
            <span>Área</span>
            <span>Versão</span>
            <span>Atualizado</span>
            <span />
          </div>
          {displayed.map((t) => (
            <div key={t.id} className="biblioteca-row">
              <div className="biblioteca-row-name">
                <Sparkles size={15} style={{ color: 'var(--c-primary)', flexShrink: 0 }} />
                <div>
                  <strong>{t.titulo}</strong>
                  <span>{t.categoria}</span>
                </div>
              </div>
              <span className="biblioteca-row-area">
                {t.area ? areaLabel(t.area) : '—'}
              </span>
              <span className="biblioteca-row-version">v{t.versao ?? 1}</span>
              <span className="biblioteca-row-date">{formatDate(t.updatedAt)}</span>
              <div className="biblioteca-row-actions">
                {t.tags?.length > 0 && (
                  <div className="tag-list">
                    {t.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
                <Button variant="secondary" style={{ fontSize: 12, padding: '5px 12px' }}>
                  <Pencil size={13} /> Editar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
