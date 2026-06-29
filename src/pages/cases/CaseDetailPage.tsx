import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  CheckCircle2,
  Circle,
  Copy,
  Download,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { areaLabel, caseStatusLabel, caseStatusOptions, formatDate } from '@/lib/utils'
import { casesService, type UpdateCasePatch } from '@/services/cases.service'
import { deadlinesService } from '@/services/deadlines.service'
import { monitoringService } from '@/services/monitoring.service'
import { etapasService } from '@/services/etapas.service'
import api from '@/lib/axios'

type Tab = 'documentos' | 'prazos' | 'historico' | 'observacoes'

interface PecaGerada {
  id: string; casoId: string; categoria: string; conteudo: string; versao: number; createdAt: string
}

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('historico')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<UpdateCasePatch>({})
  const [updateMsg, setUpdateMsg] = useState<string | null>(null)
  const [novaEtapa, setNovaEtapa] = useState('')
  const [addingEtapa, setAddingEtapa] = useState(false)

  const { data: legalCase, isLoading } = useQuery({
    queryKey: ['case', id],
    queryFn: () => casesService.get(id!),
    enabled: !!id,
  })

  const { data: allDeadlines = [] } = useQuery({ queryKey: ['deadlines'], queryFn: deadlinesService.list })
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
  const { data: etapas = [] } = useQuery({
    queryKey: ['etapas', id],
    queryFn: () => etapasService.list(id!),
    enabled: !!id,
  })

  const salvar = useMutation({
    mutationFn: () => casesService.update(id!, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['case', id] }); qc.invalidateQueries({ queryKey: ['cases'] }); setEditing(false) },
  })

  const arquivar = useMutation({
    mutationFn: () => casesService.archive(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['case', id] }); qc.invalidateQueries({ queryKey: ['cases'] }) },
  })

  const atualizarProcesso = useMutation({
    mutationFn: () => monitoringService.atualizar(id!),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['movimentacoes', id] })
      qc.invalidateQueries({ queryKey: ['movimentacoes-recentes'] })
      setUpdateMsg(res.novasMovimentacoes > 0
        ? `${res.novasMovimentacoes} nova(s) movimentação(ões) via ${res.provedor}.`
        : `Nenhuma movimentação nova (${res.provedor}).`)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro ao atualizar.'
      setUpdateMsg(msg)
    },
  })

  const toggleEtapa = useMutation({
    mutationFn: ({ etapaId, concluida }: { etapaId: string; concluida: boolean }) =>
      etapasService.update(etapaId, { concluida }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['etapas', id] }),
  })

  const criarEtapa = useMutation({
    mutationFn: () => etapasService.create(id!, novaEtapa.trim(), etapas.length),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['etapas', id] }); setNovaEtapa(''); setAddingEtapa(false) },
  })

  const removerEtapa = useMutation({
    mutationFn: (etapaId: string) => etapasService.remove(etapaId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['etapas', id] }),
  })

  const ultimaPeca = pecas[0] ?? null
  const caseDeadlines = allDeadlines.filter((d) => d.caseId === id)
  const docs = legalCase?.recommendedDocuments ?? []

  function startEdit() {
    if (!legalCase) return
    setForm({ numeroProcesso: legalCase.caseNumber ?? '', tribunal: legalCase.tribunal ?? '', areaJuridica: legalCase.area, categoria: legalCase.category ?? '', status: legalCase.status })
    setEditing(true)
  }

  function exportarWord() {
    if (!ultimaPeca) return
    const html = `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"/></head><body>${ultimaPeca.conteudo}</body></html>`
    const blob = new Blob([html], { type: 'application/msword' })
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${ultimaPeca.categoria}_v${ultimaPeca.versao}.doc` })
    a.click(); URL.revokeObjectURL(a.href)
  }

  function copiarPeca() {
    if (!ultimaPeca) return
    const tmp = document.createElement('div'); tmp.innerHTML = ultimaPeca.conteudo
    navigator.clipboard.writeText(tmp.innerText)
  }

  const etapasConcluidas = etapas.filter((e) => e.concluida).length
  const progresso = etapas.length > 0 ? Math.round((etapasConcluidas / etapas.length) * 100) : 0

  if (isLoading) return <div className="screen-loader">Carregando caso...</div>
  if (!legalCase) return <div className="page-stack"><p>Caso não encontrado.</p></div>

  return (
    <div className="case-detail-layout">
      <div className="case-detail-main">
        <div className="case-detail-header">
          <div>
            <p className="eyebrow">{areaLabel(legalCase.area)}</p>
            <h1>{legalCase.clientName}</h1>
            {legalCase.caseNumber && <p style={{ color: 'var(--muted)', fontSize: 13 }}>{legalCase.caseNumber}</p>}
          </div>
          <div className="button-row" style={{ margin: 0 }}>
            <Button variant="secondary" onClick={startEdit}><Pencil size={15} /> Editar</Button>
            {legalCase.status !== 'arquivado' && (
              <Button variant="secondary" onClick={() => arquivar.mutate()} disabled={arquivar.isPending}>
                <Archive size={15} /> Arquivar
              </Button>
            )}
            <Button onClick={() => navigate(`/cases/${id}/pecas`)}><Sparkles size={16} /> Peças com IA</Button>
            <Button onClick={() => navigate('/trabalho')} style={{ background: 'var(--grad-primary)' }}>
              <Play size={15} fill="currentColor" /> Continuar
            </Button>
          </div>
        </div>

        {editing && (
          <div className="panel" style={{ marginBottom: 16 }}>
            <h2 style={{ marginBottom: 16 }}>Editar caso</h2>
            <div className="form-stack">
              <label>Número CNJ<input type="text" value={form.numeroProcesso ?? ''} onChange={(e) => setForm({ ...form, numeroProcesso: e.target.value })} placeholder="0000000-00.0000.0.00.0000" /></label>
              <label>Tribunal<input type="text" value={form.tribunal ?? ''} onChange={(e) => setForm({ ...form, tribunal: e.target.value })} /></label>
              <label>Categoria<input type="text" value={form.categoria ?? ''} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></label>
              <label>Status
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as UpdateCasePatch['status'] })}>
                  {caseStatusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
              <div className="button-row">
                <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>{salvar.isPending ? 'Salvando...' : 'Salvar'}</Button>
                <Button variant="secondary" onClick={() => setEditing(false)}>Cancelar</Button>
              </div>
            </div>
          </div>
        )}

        <div className="case-tabs">
          {(['historico', 'prazos', 'documentos', 'observacoes'] as Tab[]).map((t) => (
            <button key={t} className={`case-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'historico' ? 'Histórico' : t === 'prazos' ? 'Prazos' : t === 'documentos' ? 'Documentos' : 'Observações'}
            </button>
          ))}
        </div>

        <div className="case-tab-content">
          {tab === 'historico' && (
            <div className="panel">
              <div className="panel-title">
                <h2>Histórico de movimentações</h2>
                <Button variant="secondary" onClick={() => atualizarProcesso.mutate()} disabled={atualizarProcesso.isPending}>
                  <RefreshCw size={15} className={atualizarProcesso.isPending ? 'spin' : ''} />
                  {atualizarProcesso.isPending ? 'Consultando...' : 'Atualizar'}
                </Button>
              </div>
              {updateMsg && <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{updateMsg}</p>}
              {movimentacoes.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>Nenhuma movimentação. Clique em "Atualizar" para consultar.</p>
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
            </div>
          )}

          {tab === 'prazos' && (
            <div className="panel">
              <div className="panel-title">
                <h2>Prazos do caso</h2>
              </div>
              {caseDeadlines.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>Nenhum prazo cadastrado.</p>
              ) : (
                <div className="list">
                  {caseDeadlines.map((d) => (
                    <div key={d.id} className={`list-row deadline-row-${d.priority}`}>
                      <div>
                        <strong>{d.title}</strong>
                        <span>{d.responsavel || '—'}</span>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <time style={{ display: 'block', fontWeight: 700 }}>{formatDate(d.dueDate)}</time>
                        <span style={{ fontSize: 12, color: d.priority === 'critical' ? 'var(--danger)' : 'var(--muted)' }}>
                          {d.businessDaysLeft} dias úteis
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'documentos' && (
            <div className="panel">
              <div className="panel-title">
                <h2>Documentos</h2>
                {ultimaPeca && (
                  <div className="button-row" style={{ margin: 0 }}>
                    <Button variant="secondary" onClick={exportarWord}><Download size={15} /> Word</Button>
                    <Button variant="secondary" onClick={copiarPeca}><Copy size={15} /> Copiar peça</Button>
                  </div>
                )}
              </div>
              {docs.length === 0 && !ultimaPeca ? (
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>Nenhum documento ainda.</p>
              ) : (
                <>
                  {docs.length > 0 && (
                    <div className="list" style={{ marginBottom: ultimaPeca ? 16 : 0 }}>
                      {docs.map((doc, i) => (
                        <div key={i} className="list-row">
                          <div>
                            <strong>{doc.name}</strong>
                          </div>
                          <span className={`badge ${doc.received ? 'badge-success' : 'badge-normal'}`}>
                            {doc.received ? 'Recebido' : 'Pendente'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {ultimaPeca && (
                    <div style={{ background: 'var(--surface-soft)', borderRadius: 'var(--radius-sm)', padding: '14px 16px' }}>
                      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>PEÇA GERADA</p>
                      <strong>{ultimaPeca.categoria} — v{ultimaPeca.versao}</strong>
                      <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 10px' }}>
                        {formatDate(ultimaPeca.createdAt)}
                      </p>
                      <Button variant="secondary" onClick={() => navigate(`/cases/${id}/pecas`)}>
                        <Pencil size={14} /> Editar peça
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === 'observacoes' && (
            <div className="panel">
              <h2>Observações</h2>
              <textarea
                className="obs-textarea"
                placeholder="Adicione observações sobre o caso..."
                rows={8}
              />
            </div>
          )}
        </div>
      </div>

      <div className="case-detail-aside">
        <div className="panel">
          <p className="section-label" style={{ marginBottom: 14 }}>CASO</p>
          <dl className="definition-list" style={{ gap: 14 }}>
            <div>
              <dt>Status</dt>
              <dd><span className="badge badge-normal">{caseStatusLabel(legalCase.status)}</span></dd>
            </div>
            <div><dt>Cliente</dt><dd>{legalCase.clientName}</dd></div>
            {legalCase.clientPhone && <div><dt>Telefone</dt><dd>{legalCase.clientPhone}</dd></div>}
            {legalCase.tribunal && <div><dt>Tribunal</dt><dd>{legalCase.tribunal}</dd></div>}
            <div><dt>Área</dt><dd>{areaLabel(legalCase.area)}</dd></div>
            <div><dt>Atualizado</dt><dd>{formatDate(legalCase.updatedAt)}</dd></div>
          </dl>

          {caseDeadlines.filter((d) => !d.completed).length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 8 }}>PRÓXIMA EXECUÇÃO</p>
              <strong style={{ fontSize: 14 }}>
                {caseDeadlines.filter((d) => !d.completed).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]?.title}
              </strong>
            </div>
          )}
        </div>

        <div className="panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <p className="section-label" style={{ margin: 0 }}>ETAPAS</p>
            {etapas.length > 0 && (
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{etapasConcluidas}/{etapas.length}</span>
            )}
          </div>

          {etapas.length > 0 && (
            <div className="etapas-progress-bar">
              <div style={{ width: `${progresso}%` }} />
            </div>
          )}

          <div className="etapas-checklist" style={{ marginTop: etapas.length > 0 ? 12 : 0 }}>
            {etapas.map((et) => (
              <div key={et.id} className={`etapa-item ${et.concluida ? 'etapa-done' : ''}`}>
                <button
                  style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                  onClick={() => toggleEtapa.mutate({ etapaId: et.id, concluida: !et.concluida })}
                >
                  {et.concluida
                    ? <CheckCircle2 size={17} style={{ color: 'var(--success)', flexShrink: 0 }} />
                    : <Circle size={17} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                  }
                  <span style={{ fontSize: 14 }}>{et.titulo}</span>
                </button>
                <button
                  className="etapa-delete-btn"
                  onClick={() => removerEtapa.mutate(et.id)}
                  aria-label="Remover etapa"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          {addingEtapa ? (
            <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
              <input
                autoFocus
                className="etapa-input"
                placeholder="Nome da etapa..."
                value={novaEtapa}
                onChange={(e) => setNovaEtapa(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && novaEtapa.trim()) criarEtapa.mutate()
                  if (e.key === 'Escape') setAddingEtapa(false)
                }}
              />
              <Button
                onClick={() => criarEtapa.mutate()}
                disabled={!novaEtapa.trim() || criarEtapa.isPending}
                style={{ padding: '0 12px', flexShrink: 0 }}
              >
                OK
              </Button>
            </div>
          ) : (
            <button className="add-etapa-btn" onClick={() => setAddingEtapa(true)}>
              <Plus size={14} /> Adicionar etapa
            </button>
          )}

          {etapas.length > 0 && (
            <Button
              onClick={() => navigate('/trabalho')}
              style={{ width: '100%', marginTop: 16, background: 'var(--grad-primary)' }}
            >
              <Play size={14} fill="currentColor" /> Continuar
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
