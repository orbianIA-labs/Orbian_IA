import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  Copy,
  Download,
  MessageSquareText,
  Pencil,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { OrbianEditor } from '@/components/editor/OrbianEditor'
import { areaLabel, caseStatusLabel, caseStatusOptions, formatDate } from '@/lib/utils'
import { casesService, type UpdateCasePatch } from '@/services/cases.service'
import { deadlinesService } from '@/services/deadlines.service'
import { monitoringService } from '@/services/monitoring.service'
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

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<UpdateCasePatch>({})
  const [updateMsg, setUpdateMsg] = useState<string | null>(null)

  const { data: legalCase, isLoading } = useQuery({
    queryKey: ['case', id],
    queryFn: () => casesService.get(id!),
    enabled: !!id,
  })

  const { data: allDeadlines = [] } = useQuery({
    queryKey: ['deadlines'],
    queryFn: deadlinesService.list,
  })

  const { data: pecas = [] } = useQuery<PecaGerada[]>({
    queryKey: ['pecas', id],
    queryFn: () => api.get(`/api/casos/${id}/pecas`).then((r) => r.data),
    enabled: !!id,
  })

  const { data: movimentacoes = [] } = useQuery({
    queryKey: ['movimentacoes', id],
    queryFn: () => monitoringService.list(id!),
    enabled: !!id,
  })

  const salvar = useMutation({
    mutationFn: () => casesService.update(id!, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case', id] })
      qc.invalidateQueries({ queryKey: ['cases'] })
      setEditing(false)
    },
  })

  const arquivar = useMutation({
    mutationFn: () => casesService.archive(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case', id] })
      qc.invalidateQueries({ queryKey: ['cases'] })
    },
  })

  const atualizarProcesso = useMutation({
    mutationFn: () => monitoringService.atualizar(id!),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['movimentacoes', id] })
      qc.invalidateQueries({ queryKey: ['movimentacoes-recentes'] })
      setUpdateMsg(
        res.novasMovimentacoes > 0
          ? `${res.novasMovimentacoes} nova(s) movimentação(ões) via ${res.provedor}.`
          : `Nenhuma movimentação nova (${res.provedor}).`,
      )
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Erro ao atualizar o processo.'
      setUpdateMsg(msg)
    },
  })

  const ultimaPeca = pecas[0] ?? null
  const caseDeadlines = allDeadlines.filter((d) => d.caseId === id)

  function startEdit() {
    if (!legalCase) return
    setForm({
      numeroProcesso: legalCase.caseNumber ?? '',
      tribunal: legalCase.tribunal ?? '',
      areaJuridica: legalCase.area,
      categoria: legalCase.category ?? '',
      status: legalCase.status,
    })
    setEditing(true)
  }

  const copiarPeca = () => {
    if (!ultimaPeca) return
    const tmp = document.createElement('div')
    tmp.innerHTML = ultimaPeca.conteudo
    navigator.clipboard.writeText(tmp.innerText)
  }

  const exportarWord = () => {
    if (!ultimaPeca) return
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"/></head><body>${ultimaPeca.conteudo}</body></html>`
    const blob = new Blob([html], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${ultimaPeca.categoria.replace(/\s+/g, '_')}_v${ultimaPeca.versao}.doc`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copiarWhatsApp = () => {
    if (!legalCase) return
    const msg = `Olá ${legalCase.clientName}. Houve atualização no seu processo. Acesse para mais detalhes ou aguarde nosso contato.`
    navigator.clipboard.writeText(msg)
  }

  if (isLoading) return <div className="screen-loader">Carregando caso...</div>
  if (!legalCase) return <div className="page-stack"><p>Caso não encontrado.</p></div>

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">{legalCase.flow || areaLabel(legalCase.area)}</p>
          <h1>{legalCase.clientName}</h1>
          <p>
            {areaLabel(legalCase.area)}
            {legalCase.category ? ` / ${legalCase.category}` : ''}
          </p>
        </div>
        <div className="button-row" style={{ margin: 0 }}>
          <Button variant="secondary" onClick={startEdit}>
            <Pencil size={16} />
            Editar
          </Button>
          {legalCase.status !== 'arquivado' && (
            <Button variant="secondary" onClick={() => arquivar.mutate()} disabled={arquivar.isPending}>
              <Archive size={16} />
              Arquivar
            </Button>
          )}
          <Button onClick={() => navigate(`/cases/${id}/pecas`)}>
            <Sparkles size={18} />
            Peças com IA
          </Button>
        </div>
      </section>

      <section className="two-column">
        <article className="panel">
          <h2>Dados do caso</h2>

          {editing ? (
            <div className="form-stack">
              <label>
                <span>Número CNJ</span>
                <input
                  type="text"
                  value={form.numeroProcesso ?? ''}
                  onChange={(e) => setForm({ ...form, numeroProcesso: e.target.value })}
                  placeholder="0000000-00.0000.0.00.0000"
                />
              </label>
              <label>
                <span>Tribunal</span>
                <input
                  type="text"
                  value={form.tribunal ?? ''}
                  onChange={(e) => setForm({ ...form, tribunal: e.target.value })}
                  placeholder="Ex.: TJSP"
                />
              </label>
              <label>
                <span>Categoria</span>
                <input
                  type="text"
                  value={form.categoria ?? ''}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                />
              </label>
              <label>
                <span>Status</span>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as UpdateCasePatch['status'] })}
                >
                  {caseStatusOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="button-row">
                <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
                  {salvar.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button variant="secondary" onClick={() => setEditing(false)}>
                  Cancelar
                </Button>
              </div>
              {salvar.isError && (
                <p style={{ color: 'var(--danger)', fontSize: 13 }}>Erro ao salvar. Verifique o número CNJ.</p>
              )}
            </div>
          ) : (
            <dl className="definition-list">
              <div>
                <dt>Número CNJ</dt>
                <dd>{legalCase.caseNumber ?? '—'}</dd>
              </div>
              <div>
                <dt>Tribunal</dt>
                <dd>{legalCase.tribunal || '—'}</dd>
              </div>
              <div>
                <dt>Área</dt>
                <dd>{areaLabel(legalCase.area)}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{caseStatusLabel(legalCase.status)}</dd>
              </div>
              <div>
                <dt>Atualizado</dt>
                <dd>{formatDate(legalCase.updatedAt)}</dd>
              </div>
            </dl>
          )}
        </article>

        <article className="panel">
          <h2>Prazos do caso</h2>
          {caseDeadlines.length === 0 && (
            <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Nenhum prazo cadastrado</p>
          )}
          <div className="list">
            {caseDeadlines.map((deadline) => (
              <div className="list-row" key={deadline.id}>
                <div>
                  <strong>{deadline.title}</strong>
                  <span>{deadline.businessDaysLeft} dias úteis restantes</span>
                </div>
                <time>{formatDate(deadline.dueDate)}</time>
              </div>
            ))}
          </div>
        </article>
      </section>

      <article className="panel">
        <div className="panel-title">
          <h2>Movimentações processuais</h2>
          <Button
            variant="secondary"
            onClick={() => atualizarProcesso.mutate()}
            disabled={atualizarProcesso.isPending}
          >
            <RefreshCw size={16} className={atualizarProcesso.isPending ? 'spin' : ''} />
            {atualizarProcesso.isPending ? 'Consultando...' : 'Atualizar processo'}
          </Button>
        </div>
        {updateMsg && (
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>{updateMsg}</p>
        )}
        {movimentacoes.length === 0 ? (
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
            Nenhuma movimentação ainda. Clique em "Atualizar processo" para consultar.
          </p>
        ) : (
          <ol className="timeline">
            {movimentacoes.map((mov) => (
              <li className="timeline-item" key={mov.id}>
                <time>{formatDate(mov.date)}</time>
                <p>{mov.description}</p>
              </li>
            ))}
          </ol>
        )}
      </article>

      <section className="two-column">
        <article className="panel">
          <h2>
            {ultimaPeca ? `${ultimaPeca.categoria} (v${ultimaPeca.versao})` : 'Peça gerada'}
          </h2>
          {ultimaPeca ? (
            <>
              <OrbianEditor content={ultimaPeca.conteudo} readOnly />
              <div className="button-row">
                <Button variant="secondary" onClick={exportarWord}>
                  <Download size={17} />
                  Word
                </Button>
                <Button variant="secondary" onClick={copiarPeca}>
                  <Copy size={17} />
                  Copiar
                </Button>
                <Button variant="secondary" onClick={() => navigate(`/cases/${id}/pecas`)}>
                  <Pencil size={17} />
                  Editar peça
                </Button>
              </div>
            </>
          ) : (
            <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
              Nenhuma peça gerada ainda.{' '}
              <button
                onClick={() => navigate(`/cases/${id}/pecas`)}
                style={{
                  color: 'var(--accent)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: 14,
                  padding: 0,
                }}
              >
                Gerar com IA
              </button>
            </p>
          )}
        </article>

        <article className="panel">
          <h2>Atualização do cliente</h2>
          <p>
            Olá {legalCase.clientName}. Houve atualização no seu processo. Acesse para mais detalhes
            ou aguarde nosso contato.
          </p>
          <Button variant="secondary" onClick={copiarWhatsApp}>
            <MessageSquareText size={17} />
            Copiar para WhatsApp
          </Button>
        </article>
      </section>
    </div>
  )
}
