import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Download, FileText, Loader2, Plus, Save, Sparkles, Trash2 } from 'lucide-react'
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

interface TemplatePeca {
  id: string
  categoria: string
  titulo: string
  tags: string[]
}

export function PecasPage() {
  const { id: casoId } = useParams<{ id: string }>()
  const qc = useQueryClient()

  const [categoria, setCategoria] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [instrucoes, setInstrucoes] = useState('')
  const [pecaSelecionada, setPecaSelecionada] = useState<PecaGerada | null>(null)
  const [editedContent, setEditedContent] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)

  const { data: pecas = [], isLoading } = useQuery<PecaGerada[]>({
    queryKey: ['pecas', casoId],
    queryFn: () => api.get(`/api/casos/${casoId}/pecas`).then((r) => r.data),
    enabled: !!casoId,
  })

  const TIPOS_PECA = [
    'Contestação',
    'Petição Inicial',
    'Réplica',
    'Manifestação',
    'Embargos de Declaração',
    'Agravo de Instrumento',
    'Apelação',
    'Recurso Ordinário',
    'Mandado de Segurança',
    'Outros',
  ]

  const { data: categoriasApi = [] } = useQuery<string[]>({
    queryKey: ['categorias-templates'],
    queryFn: () => api.get('/api/templates/categorias').then((r) => r.data),
  })

  const categorias = TIPOS_PECA

  const { data: templates = [] } = useQuery<TemplatePeca[]>({
    queryKey: ['templates', categoria],
    queryFn: () => api.get('/api/templates', { params: { categoria } }).then((r) => r.data),
    enabled: !!categoria,
  })

  // Mantém o conteúdo editável em sincronia com a peça selecionada
  useEffect(() => {
    setEditedContent(pecaSelecionada?.conteudo ?? '')
  }, [pecaSelecionada])

  const gerar = useMutation({
    mutationFn: () =>
      api
        .post<PecaGerada>(`/api/casos/${casoId}/pecas/gerar`, {
          casoId,
          categoria,
          descricaoSolicitacao: descricao,
          instrucoesAdicionais: instrucoes || null,
          templateId: templateId || null,
        })
        .then((r) => r.data),
    onSuccess: (peca) => {
      qc.invalidateQueries({ queryKey: ['pecas', casoId] })
      setPecaSelecionada(peca)
      setMostrarForm(false)
      setCategoria('')
      setTemplateId('')
      setDescricao('')
      setInstrucoes('')
    },
  })

  const salvar = useMutation({
    mutationFn: () =>
      api
        .patch<PecaGerada>(`/api/casos/${casoId}/pecas/${pecaSelecionada!.id}`, {
          conteudo: editedContent,
        })
        .then((r) => r.data),
    onSuccess: (peca) => {
      qc.invalidateQueries({ queryKey: ['pecas', casoId] })
      setPecaSelecionada(peca)
    },
  })

  const deletar = useMutation({
    mutationFn: (pecaId: string) => api.delete(`/api/casos/${casoId}/pecas/${pecaId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pecas', casoId] })
      setPecaSelecionada(null)
    },
  })

  const copiarTexto = () => {
    const tmp = document.createElement('div')
    tmp.innerHTML = editedContent
    navigator.clipboard.writeText(tmp.innerText)
  }

  const exportarWord = () => {
    if (!pecaSelecionada) return
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"/></head><body>${editedContent}</body></html>`
    const blob = new Blob([html], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${pecaSelecionada.categoria.replace(/\s+/g, '_')}_v${pecaSelecionada.versao}.doc`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportarPdf = () => {
    if (!pecaSelecionada) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><meta charset="utf-8"/><title>${pecaSelecionada.categoria}</title>
      <style>body{font-family:Georgia,serif;line-height:1.6;max-width:720px;margin:40px auto;padding:0 24px;color:#111}</style>
      </head><body>${editedContent}</body></html>`)
    win.document.close()
    win.focus()
    win.print()
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
              <span>1. Tipo de peça</span>
              <select
                value={categoria}
                onChange={(e) => {
                  setCategoria(e.target.value)
                  setTemplateId('')
                }}
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

            {categoria && (
              <label>
                <span>2. Modelo de referência (opcional — a IA escolhe o melhor se vazio)</span>
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 14 }}
                >
                  <option value="">Automático ({templates.length} modelos disponíveis)</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.titulo}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              <span>3. Tipo de peça / descrição</span>
              <input
                type="text"
                placeholder="ex: obrigação de fazer com tutela antecedente - assistência técnica"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </label>

            <label>
              <span>4. Instruções adicionais (opcional)</span>
              <textarea
                placeholder="ex: mencionar que o produto está na garantia, incluir pedido de danos morais de R$ 5.000"
                value={instrucoes}
                onChange={(e) => setInstrucoes(e.target.value)}
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </label>

            <div className="button-row">
              <Button onClick={() => gerar.mutate()} disabled={!categoria || !descricao || gerar.isPending}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <h2 style={{ margin: 0 }}>{pecaSelecionada.categoria}</h2>
              <div className="button-row" style={{ margin: 0, flexWrap: 'wrap' }}>
                <Button
                  onClick={() => salvar.mutate()}
                  disabled={salvar.isPending || editedContent === pecaSelecionada.conteudo}
                >
                  <Save size={15} /> {salvar.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button variant="secondary" onClick={exportarPdf}>
                  <FileText size={15} /> PDF
                </Button>
                <Button variant="secondary" onClick={exportarWord}>
                  <Download size={15} /> Word
                </Button>
                <Button variant="secondary" onClick={copiarTexto}>
                  <Copy size={15} /> Copiar
                </Button>
              </div>
            </div>
            <OrbianEditor
              key={pecaSelecionada.id}
              content={pecaSelecionada.conteudo}
              onChange={setEditedContent}
            />
          </article>
        )}
      </div>
    </div>
  )
}
