import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { OrbianEditor } from '@/components/editor/OrbianEditor'
import api from '@/lib/axios'

interface PecaGerada {
  id: string
  casoId: string
  categoria: string
  conteudo: string
  versao: number
  promptReferencia: string
  createdAt: string
}

export function PecasPage() {
  const { id: casoId } = useParams<{ id: string }>()
  const qc = useQueryClient()

  const [categoria, setCategoria] = useState('')
  const [descricao, setDescricao] = useState('')
  const [instrucoes, setInstrucoes] = useState('')
  const [pecaSelecionada, setPecaSelecionada] = useState<PecaGerada | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  const { data: pecas = [], isLoading } = useQuery<PecaGerada[]>({
    queryKey: ['pecas', casoId],
    queryFn: () => api.get(`/api/casos/${casoId}/pecas`).then((r) => r.data),
    enabled: !!casoId,
  })

  const { data: categorias = [] } = useQuery<string[]>({
    queryKey: ['categorias-templates'],
    queryFn: () => api.get('/api/templates/categorias').then((r) => r.data),
  })

  const gerar = useMutation({
    mutationFn: () =>
      api
        .post<PecaGerada>(`/api/casos/${casoId}/pecas/gerar`, {
          casoId,
          categoria,
          descricaoSolicitacao: descricao,
          instrucoesAdicionais: instrucoes || null,
        })
        .then((r) => r.data),
    onSuccess: (peca) => {
      qc.invalidateQueries({ queryKey: ['pecas', casoId] })
      setPecaSelecionada(peca)
      setMostrarForm(false)
      setCategoria('')
      setDescricao('')
      setInstrucoes('')
    },
  })

  const deletar = useMutation({
    mutationFn: (pecaId: string) =>
      api.delete(`/api/casos/${casoId}/pecas/${pecaId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pecas', casoId] })
      setPecaSelecionada(null)
    },
  })

  const copiarTexto = () => {
    if (!pecaSelecionada) return
    const tmp = document.createElement('div')
    tmp.innerHTML = pecaSelecionada.conteudo
    navigator.clipboard.writeText(tmp.innerText)
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Peças Jurídicas</p>
          <h1>Banco de Peças com IA</h1>
          <p>Gere peças personalizadas com base nos modelos do escritório</p>
        </div>
        <Button onClick={() => setMostrarForm(true)}>
          <Plus size={18} />
          Nova peça
        </Button>
      </section>

      {mostrarForm && (
        <article className="panel">
          <h2>
            <Sparkles size={18} style={{ display: 'inline', marginRight: 6 }} />
            Gerar Nova Peça com IA
          </h2>

          <div className="form-stack">
            <label>
              <span>Categoria</span>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 14 }}
              >
                <option value="">Selecione uma categoria...</option>
                {categorias.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Tipo de peça / descrição</span>
              <input
                type="text"
                placeholder="ex: obrigação de fazer com tutela antecedente - assistência técnica"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </label>

            <label>
              <span>Instruções adicionais (opcional)</span>
              <textarea
                placeholder="ex: mencionar que o produto está na garantia, incluir pedido de danos morais de R$ 5.000"
                value={instrucoes}
                onChange={(e) => setInstrucoes(e.target.value)}
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </label>

            <div className="button-row">
              <Button
                onClick={() => gerar.mutate()}
                disabled={!categoria || !descricao || gerar.isPending}
              >
                {gerar.isPending ? (
                  <>
                    <Loader2 size={17} className="spin" /> Gerando com IA...
                  </>
                ) : (
                  <>
                    <Sparkles size={17} /> Gerar peça
                  </>
                )}
              </Button>
              <Button variant="secondary" onClick={() => setMostrarForm(false)}>
                Cancelar
              </Button>
            </div>

            {gerar.isError && (
              <p style={{ color: 'var(--danger)', fontSize: 13 }}>
                Erro ao gerar: {(gerar.error as Error).message}
              </p>
            )}
          </div>
        </article>
      )}

      <div className="two-column">
        <article className="panel">
          <h2>Peças geradas</h2>

          {isLoading && <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Carregando...</p>}

          {!isLoading && pecas.length === 0 && (
            <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
              Nenhuma peça gerada ainda. Clique em "Nova peça" para começar.
            </p>
          )}

          <div className="list">
            {pecas.map((peca) => (
              <div
                key={peca.id}
                className={`list-row${pecaSelecionada?.id === peca.id ? ' active' : ''}`}
                onClick={() => setPecaSelecionada(peca)}
                style={{ cursor: 'pointer' }}
              >
                <div>
                  <strong>{peca.categoria}</strong>
                  <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
                    v{peca.versao} · {peca.promptReferencia.split('|')[0].trim()}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deletar.mutate(peca.id)
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)' }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </article>

        {pecaSelecionada && (
          <article className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>{pecaSelecionada.categoria}</h2>
              <div className="button-row" style={{ margin: 0 }}>
                <Button variant="secondary" onClick={copiarTexto}>
                  <Copy size={15} /> Copiar texto
                </Button>
              </div>
            </div>
            <OrbianEditor content={pecaSelecionada.conteudo} readOnly />
          </article>
        )}
      </div>
    </div>
  )
}
