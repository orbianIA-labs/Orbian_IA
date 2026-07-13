import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Archive, Calendar, CheckCircle2,
  Download, FileText, Lock, Pencil, Play, Plus, ShieldCheck, Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { areaLabel, caseStatusLabel, caseStatusOptions, formatDate } from '@/lib/utils'
import { casesService, type UpdateCasePatch } from '@/services/cases.service'
import { deadlinesService } from '@/services/deadlines.service'
import { documentosService } from '@/services/documentos.service'
import { toast } from '@/store/toastStore'
import api from '@/lib/axios'
import type { EtapaPipeline } from '@/types/domain.types'

interface PecaGerada {
  id: string; casoId: string; categoria: string; conteudo: string; versao: number; createdAt: string
}

const PIPELINE: { key: EtapaPipeline; label: string }[] = [
  { key: 'cadastro',     label: 'Cadastro' },
  { key: 'documentos',   label: 'Documentos' },
  { key: 'pecas',        label: 'Gerar Peças' },
  { key: 'prazos',       label: 'Prazos' },
  { key: 'revisao',      label: 'Revisão' },
  { key: 'encerramento', label: 'Finalização' },
]

const DOC_TIPOS = ['Petição Inicial', 'Procuração', 'Contrato', 'Documentos pessoais', 'Comprovantes', 'Conversas', 'Outros anexos']

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<UpdateCasePatch>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadTipoRef = useRef('')
  const [mostrarSeletorTipo, setMostrarSeletorTipo] = useState(false)
  const [addingPrazo, setAddingPrazo] = useState(false)
  const [prazoForm, setPrazoForm] = useState({ titulo: '', dataVencimento: '' })

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
  const { data: documentos = [] } = useQuery({
    queryKey: ['documentos', id],
    queryFn: () => documentosService.list(id!),
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

  const avancarEtapa = useMutation({
    mutationFn: (etapa: EtapaPipeline) =>
      casesService.update(id!, etapa === 'encerramento' ? { etapaAtual: etapa, status: 'finalizado' } : { etapaAtual: etapa }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['case', id] }); qc.invalidateQueries({ queryKey: ['cases'] }) },
  })

  const uploadDoc = useMutation({
    mutationFn: ({ file, tipo }: { file: File; tipo: string }) => documentosService.upload(id!, file, tipo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documentos', id] }),
  })

  const criarPrazo = useMutation({
    mutationFn: () => deadlinesService.create({ casoId: id!, titulo: prazoForm.titulo.trim(), dataVencimento: prazoForm.dataVencimento }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deadlines'] })
      setAddingPrazo(false)
      setPrazoForm({ titulo: '', dataVencimento: '' })
    },
  })

  const caseDeadlines = allDeadlines.filter((d) => d.caseId === id)
  const pendingDeadlines = caseDeadlines.filter((d) => !d.completed)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
  const proximoDeadline = pendingDeadlines[0]

  // ── Gating do pipeline: cada etapa só libera a próxima se o requisito for cumprido ──
  const docCount = documentos.length
  const hasPeca = pecas.length >= 1
  // Regra: só é possível gerar peças com ao menos 1 documento anexado.
  const podeGerarPecas = docCount > 0
  const bloqueioPecasHint = 'Adicione ao menos 1 documento ao caso para gerar peças.'

  const stageReq: Record<EtapaPipeline, { met: boolean; hint: string }> = {
    cadastro:     { met: true, hint: '' },
    documentos:   { met: docCount >= 1, hint: 'Adicione pelo menos 1 documento para liberar as Peças.' },
    pecas:        { met: hasPeca, hint: 'Gere pelo menos 1 peça para avançar.' },
    // Prazos ↔ Agenda: só avança com pelo menos 1 prazo cadastrado para o caso.
    prazos:       { met: caseDeadlines.length > 0, hint: 'Cadastre um prazo (Agenda) para avançar.' },
    revisao:      { met: hasPeca, hint: 'É preciso ter uma peça para revisar.' },
    protocolo:    { met: true, hint: '' },
    atualizacoes: { met: true, hint: '' },
    encerramento: { met: true, hint: '' },
  }

  // Caso já criado ⇒ Cadastro conta como concluído; corrente começa em Documentos.
  const storedIdx = PIPELINE.findIndex((s) => s.key === legalCase?.etapaAtual)
  const currentPipelineIdx = Math.max(1, storedIdx)
  const currentStage = PIPELINE[currentPipelineIdx]
  const currentReq = stageReq[currentStage.key]
  const canAdvance = currentReq.met
  const nextStage = PIPELINE[currentPipelineIdx + 1] ?? null

  // ── Auditoria (tela de Revisão): só sinais reais, nada simulado ──
  const dadosFields = [legalCase?.caseNumber, legalCase?.tribunal, legalCase?.area, legalCase?.clientName]
  const dadosPreenchidosCount = dadosFields.filter(Boolean).length
  const dadosOk = dadosPreenchidosCount === dadosFields.length
  const pendenciasCount = PIPELINE.filter((s) => !stageReq[s.key].met).length

  function startEdit() {
    if (!legalCase) return
    setForm({
      numeroProcesso: legalCase.caseNumber ?? '',
      tribunal: legalCase.tribunal ?? '',
      areaJuridica: legalCase.area,
      categoria: legalCase.category ?? '',
      status: legalCase.status,
      tipoServico: legalCase.tipoServico ?? '',
      valorCausa: legalCase.claimValue,
      honorarios: legalCase.fees,
      valorRecebido: legalCase.received,
    })
    setEditing(true)
  }

  function abrirUpload(tipo: string) {
    uploadTipoRef.current = tipo
    setMostrarSeletorTipo(false)
    fileInputRef.current?.click()
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const tipo = uploadTipoRef.current
    if (!files.length || !tipo) return
    files.forEach((file) => uploadDoc.mutate({ file, tipo }))
    e.target.value = ''
  }

  function exportarWord(peca: PecaGerada) {
    const html = `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"/></head><body>${peca.conteudo}</body></html>`
    const blob = new Blob([html], { type: 'application/msword' })
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${peca.categoria}_v${peca.versao}.doc` })
    a.click(); URL.revokeObjectURL(a.href)
  }

  if (isLoading) return <div className="screen-loader">Carregando caso...</div>
  if (!legalCase) return <div className="page-stack"><p>Caso não encontrado.</p></div>

  return (
    <div className="workspace-layout">

      {/* ── Header ── */}
      <div className="workspace-header">
        <div>
          <p className="eyebrow">{areaLabel(legalCase.area)}{legalCase.tipoServico ? ` · ${legalCase.tipoServico}` : ''}</p>
          <h1>{legalCase.title || legalCase.clientName}</h1>
          {legalCase.caseNumber && <p style={{ color: 'var(--muted)', fontSize: 13 }}>{legalCase.caseNumber}</p>}
        </div>
        <div className="button-row" style={{ margin: 0 }}>
          <Button variant="secondary" onClick={startEdit}><Pencil size={15} /> Editar</Button>
          {legalCase.status !== 'arquivado' && (
            <Button variant="secondary" onClick={() => arquivar.mutate()} disabled={arquivar.isPending}>
              <Archive size={15} /> Arquivar
            </Button>
          )}
          <Button
            onClick={() => podeGerarPecas ? navigate(`/cases/${id}/pecas`) : toast(bloqueioPecasHint, 'warning')}
            className={podeGerarPecas ? undefined : 'button-blocked'}
          >
            <Sparkles size={16} /> Peças com IA
          </Button>
          <Button onClick={() => navigate('/trabalho')} style={{ background: 'var(--grad-primary)' }}>
            <Play size={15} fill="currentColor" /> Continuar execução
          </Button>
        </div>
      </div>

      {/* ── Pipeline (abas compactas) ── */}
      <div className="workspace-pipeline">
        <nav className="pipeline-tabs">
          {PIPELINE.map((stage, idx) => {
            const done = idx < currentPipelineIdx
            const active = idx === currentPipelineIdx
            const locked = idx > currentPipelineIdx
            const cls = ['pipeline-tab', done && 'done', active && 'active', locked && 'locked'].filter(Boolean).join(' ')
            return (
              <span key={stage.key} className={cls}>
                {done ? <CheckCircle2 size={13} /> : locked ? <Lock size={11} /> : <span className="pipeline-tab-dot" />}
                {stage.label}
              </span>
            )
          })}
        </nav>
        {nextStage && (
          <div className="pipeline-advance">
            <button
              className="pipeline-advance-btn"
              onClick={() => canAdvance && avancarEtapa.mutate(nextStage.key)}
              disabled={!canAdvance || avancarEtapa.isPending}
            >
              {canAdvance ? `Avançar para ${nextStage.label}` : `${nextStage.label} bloqueado`}
            </button>
            {!canAdvance && (
              <p className="advance-hint"><Lock size={11} /> {currentReq.hint}</p>
            )}
          </div>
        )}
      </div>

      {/* ── Edit form ── */}
      {editing && (
        <div className="panel" style={{ marginBottom: 4 }}>
          <h2 style={{ marginBottom: 16 }}>Editar caso</h2>
          <div className="form-stack">
            <label>Número CNJ<input type="text" value={form.numeroProcesso ?? ''} onChange={(e) => setForm({ ...form, numeroProcesso: e.target.value })} placeholder="0000000-00.0000.0.00.0000" /></label>
            <label>Tribunal<input type="text" value={form.tribunal ?? ''} onChange={(e) => setForm({ ...form, tribunal: e.target.value })} /></label>
            <label>Tipo de Serviço
              <select value={form.tipoServico ?? ''} onChange={(e) => setForm({ ...form, tipoServico: e.target.value })}>
                <option value="">Selecione...</option>
                {['Processo Judicial', 'Consultoria', 'Contrato', 'Parecer', 'Administrativo'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <label>Valor da causa (R$)
                <input type="number" step="0.01" min="0" value={form.valorCausa ?? ''} onChange={(e) => setForm({ ...form, valorCausa: e.target.value === '' ? 0 : Number(e.target.value) })} placeholder="0,00" />
              </label>
              <label>Honorários (R$)
                <input type="number" step="0.01" min="0" value={form.honorarios ?? ''} onChange={(e) => setForm({ ...form, honorarios: e.target.value === '' ? 0 : Number(e.target.value) })} placeholder="0,00" />
              </label>
              <label>Já recebido (R$)
                <input type="number" step="0.01" min="0" value={form.valorRecebido ?? ''} onChange={(e) => setForm({ ...form, valorRecebido: e.target.value === '' ? 0 : Number(e.target.value) })} placeholder="0,00" />
              </label>
            </div>
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

      {/* ── Corpo do workspace ── */}
      <div className="workspace-body">
       {currentStage.key === 'revisao' ? (
        <div className="review-layout">

          {/* RESUMO + ETAPAS CONCLUÍDAS */}
          <div className="panel review-aside">
            <div className="review-status-tile">
              <span className="review-status-label">STATUS GERAL</span>
              <strong>{[dadosOk, docCount > 0, hasPeca, caseDeadlines.length > 0].filter(Boolean).length}/4</strong>
              <span className="review-status-sub">checagens OK</span>
            </div>

            <p className="section-label" style={{ margin: '18px 0 14px' }}>RESUMO DA EXECUÇÃO</p>
            <dl className="definition-list" style={{ gap: 14 }}>
              <div><dt>Cliente</dt><dd>{legalCase.clientName}</dd></div>
              {legalCase.reuNome && <div><dt>Parte Contrária</dt><dd>{legalCase.reuNome}</dd></div>}
              {legalCase.tribunal && <div><dt>Tribunal</dt><dd>{legalCase.tribunal}</dd></div>}
              <div><dt>Área</dt><dd>{areaLabel(legalCase.area)}</dd></div>
              <div><dt>Valor da causa</dt><dd>R$ {(legalCase.claimValue ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</dd></div>
              <div><dt>Atualizado</dt><dd>{formatDate(legalCase.updatedAt)}</dd></div>
            </dl>

            <p className="section-label" style={{ margin: '20px 0 12px' }}>CHECKLIST DE INTEGRIDADE</p>
            <ul className="review-timeline">
              {PIPELINE.slice(0, currentPipelineIdx).map((stage) => (
                <li key={stage.key}><CheckCircle2 size={14} /> {stage.label}</li>
              ))}
            </ul>
          </div>

          {/* AUDITORIA */}
          <div className="review-main">
            <p className="section-label">AUDITORIA CENTRAL</p>
            <div className="review-audit-grid">
              <div className="review-audit-card">
                <span className="review-audit-icon"><FileText size={16} /></span>
                <div>
                  <strong>Dados do Caso</strong>
                  <span className="review-audit-status">{dadosPreenchidosCount}/{dadosFields.length} atributos preenchidos</span>
                </div>
                <Button variant="secondary" style={{ fontSize: 12, padding: '5px 12px' }} onClick={startEdit}>Editar</Button>
              </div>
              <div className="review-audit-card">
                <span className="review-audit-icon"><FileText size={16} /></span>
                <div>
                  <strong>Documentos</strong>
                  <span className="review-audit-status">{docCount > 0 ? `${docCount} arquivo${docCount > 1 ? 's' : ''} anexado${docCount > 1 ? 's' : ''}` : 'Nenhum documento'}</span>
                </div>
                <Button variant="secondary" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => navigate(`/cases/${id}/documentos`)}>Ver</Button>
              </div>
              <div className="review-audit-card">
                <span className="review-audit-icon"><Sparkles size={16} /></span>
                <div>
                  <strong>Peça Jurídica</strong>
                  <span className="review-audit-status">{hasPeca ? `${pecas[0].categoria} · v${pecas[0].versao}` : 'Nenhuma peça gerada'}</span>
                </div>
                <Button variant="secondary" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => navigate(`/cases/${id}/pecas`)}>Ver</Button>
              </div>
              <div className="review-audit-card">
                <span className="review-audit-icon"><Calendar size={16} /></span>
                <div>
                  <strong>Prazo de Protocolo</strong>
                  <span className="review-audit-status">
                    {proximoDeadline ? `${formatDate(proximoDeadline.dueDate)}${proximoDeadline.responsavel ? ` · ${proximoDeadline.responsavel}` : ''}` : 'Nenhum prazo cadastrado'}
                  </span>
                </div>
              </div>
            </div>

            <p className="section-label" style={{ marginTop: 20 }}>AUDITORIA INTELIGENTE</p>
            <div className="review-badge-row">
              <span className={`review-check-badge ${dadosOk ? 'ok' : 'pending'}`}>
                {dadosOk ? <CheckCircle2 size={13} /> : <Lock size={11} />} Dados consistentes
              </span>
              <span className={`review-check-badge ${docCount > 0 ? 'ok' : 'pending'}`}>
                {docCount > 0 ? <CheckCircle2 size={13} /> : <Lock size={11} />} Documentos anexados
              </span>
              <span className={`review-check-badge ${hasPeca ? 'ok' : 'pending'}`}>
                {hasPeca ? <CheckCircle2 size={13} /> : <Lock size={11} />} Peça gerada
              </span>
              <span className={`review-check-badge ${caseDeadlines.length > 0 ? 'ok' : 'pending'}`}>
                {caseDeadlines.length > 0 ? <CheckCircle2 size={13} /> : <Lock size={11} />} Prazo cadastrado
              </span>
            </div>
          </div>

          {/* ORBIAN INTELLIGENCE */}
          <div className="panel review-ia-panel">
            <div className="section-head">
              <p className="section-label" style={{ margin: 0 }}>ORBIAN INTELLIGENCE</p>
              <Sparkles size={15} className="text-primary" />
            </div>
            <p className="review-ia-summary">
              {docCount} documento{docCount !== 1 ? 's' : ''} anexado{docCount !== 1 ? 's' : ''}, {pecas.length} peça{pecas.length !== 1 ? 's' : ''} gerada{pecas.length !== 1 ? 's' : ''} e {caseDeadlines.length} prazo{caseDeadlines.length !== 1 ? 's' : ''} cadastrado{caseDeadlines.length !== 1 ? 's' : ''}.
              {pendenciasCount > 0
                ? ` ${pendenciasCount} etapa${pendenciasCount > 1 ? 's' : ''} do fluxo ainda com pendência.`
                : ' Nenhuma pendência identificada no fluxo.'}
            </p>
            <div className="review-stat-grid">
              <div className="review-stat"><strong>{docCount}</strong><span>Documentos</span></div>
              <div className="review-stat"><strong>{pecas.length}</strong><span>Peças</span></div>
              <div className="review-stat"><strong>{caseDeadlines.length}</strong><span>Prazos</span></div>
              <div className="review-stat"><strong>{pendenciasCount}</strong><span>Pendências</span></div>
            </div>
          </div>

        </div>
       ) : currentStage.key === 'encerramento' ? (
        <div className="closing-layout">

          {/* RESUMO + ETAPAS CONCLUÍDAS */}
          <div className="panel closing-aside">
            <p className="section-label" style={{ marginBottom: 14 }}>RESUMO DA EXECUÇÃO</p>
            <dl className="definition-list" style={{ gap: 14 }}>
              <div><dt>Cliente</dt><dd>{legalCase.clientName}</dd></div>
              {legalCase.reuNome && <div><dt>Parte Contrária</dt><dd>{legalCase.reuNome}</dd></div>}
              {legalCase.tribunal && <div><dt>Tribunal</dt><dd>{legalCase.tribunal}</dd></div>}
              {hasPeca && <div><dt>Peça criada</dt><dd>{pecas[0].categoria}</dd></div>}
              {proximoDeadline && <div><dt>Prazo</dt><dd>{formatDate(proximoDeadline.dueDate)}</dd></div>}
              <div><dt>Atualizado</dt><dd>{formatDate(legalCase.updatedAt)}</dd></div>
            </dl>

            <p className="section-label" style={{ margin: '20px 0 12px' }}>ETAPAS CONCLUÍDAS</p>
            <ul className="review-timeline">
              {PIPELINE.slice(0, currentPipelineIdx).map((stage) => (
                <li key={stage.key}><CheckCircle2 size={14} /> {stage.label}</li>
              ))}
            </ul>
          </div>

          {/* CONCLUSÃO */}
          <div className="review-main">
            <div className="closing-hero">
              <span className="closing-hero-icon"><ShieldCheck size={28} /></span>
              <h2>Execução finalizada</h2>
              <p>O caso foi estruturado, validado e está pronto para acompanhamento operacional.</p>
            </div>

            <div className="review-stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div className="review-stat"><strong>{docCount}</strong><span>Documentos</span></div>
              <div className="review-stat"><strong>{pecas.length}</strong><span>Peças</span></div>
              <div className="review-stat"><strong>{caseDeadlines.length}</strong><span>Prazos</span></div>
              <div className="review-stat"><strong>{pendenciasCount}</strong><span>Pendências</span></div>
            </div>

            <p className="section-label" style={{ marginTop: 20 }}>LINHA DE CONSOLIDAÇÃO</p>
            <div className="review-badge-row">
              <span className={`review-check-badge ${dadosOk ? 'ok' : 'pending'}`}>
                {dadosOk ? <CheckCircle2 size={13} /> : <Lock size={11} />} Dados consistentes
              </span>
              <span className={`review-check-badge ${docCount > 0 ? 'ok' : 'pending'}`}>
                {docCount > 0 ? <CheckCircle2 size={13} /> : <Lock size={11} />} Documentos anexados
              </span>
              <span className={`review-check-badge ${hasPeca ? 'ok' : 'pending'}`}>
                {hasPeca ? <CheckCircle2 size={13} /> : <Lock size={11} />} Peça gerada
              </span>
              <span className={`review-check-badge ${caseDeadlines.length > 0 ? 'ok' : 'pending'}`}>
                {caseDeadlines.length > 0 ? <CheckCircle2 size={13} /> : <Lock size={11} />} Prazo cadastrado
              </span>
            </div>

            {hasPeca && (
              <>
                <p className="section-label" style={{ marginTop: 20 }}>REGISTRO DA EXECUÇÃO</p>
                <div className="closing-record-table">
                  <div className="closing-record-head">
                    <span>Artefato</span>
                    <span>Última modificação</span>
                    <span>Ações</span>
                  </div>
                  {pecas.map((p) => (
                    <div key={p.id} className="closing-record-row">
                      <span className="closing-record-name"><FileText size={14} /> {p.categoria} <span className="muted">v{p.versao}</span></span>
                      <span className="muted">{formatDate(p.createdAt)}</span>
                      <span className="closing-record-actions">
                        <button onClick={() => navigate(`/cases/${id}/pecas`)}>Visualizar</button>
                        <button onClick={() => exportarWord(p)}>Exportar</button>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <Button onClick={() => navigate('/cases')} style={{ marginTop: 20, alignSelf: 'flex-start' }}>
              Ir para Casos <Play size={13} fill="currentColor" />
            </Button>
          </div>

          {/* ORBIAN INTELLIGENCE */}
          <div className="panel review-ia-panel closing-ia-panel">
            <div className="section-head">
              <p className="section-label" style={{ margin: 0, color: 'inherit' }}>ORBIAN INTELLIGENCE</p>
              <Sparkles size={15} />
            </div>
            <p className="closing-ia-title">Síntese da Operação</p>
            <ul className="closing-ia-list">
              <li><Sparkles size={14} /> Execução concluída com {docCount} documento{docCount !== 1 ? 's' : ''} vinculado{docCount !== 1 ? 's' : ''}.</li>
              <li><CheckCircle2 size={14} /> {hasPeca ? 'A peça foi criada e está disponível para exportação.' : 'Nenhuma peça foi gerada nesta execução.'}</li>
              <li><FileText size={14} /> O histórico desta operação foi preservado.</li>
              <li><Sparkles size={14} /> Esta execução pode ser utilizada como referência futura.</li>
            </ul>
          </div>

        </div>
       ) : (<>
        {/* ── Coluna principal ── */}
        <div className="workspace-main">

          {/* PRÓXIMA EXECUÇÃO */}
          <div className="ws-section">
            <div className="ws-section-header">
              <p className="section-label">PRÓXIMA EXECUÇÃO</p>
              <Button variant="secondary" style={{ fontSize: 12, padding: '5px 12px' }}
                onClick={() => setAddingPrazo((v) => !v)}>
                <Plus size={13} /> Adicionar prazo
              </Button>
            </div>

            {addingPrazo && (
              <div className="panel" style={{ padding: 16, marginBottom: 12 }}>
                <div className="form-stack">
                  <label>Título
                    <input type="text" value={prazoForm.titulo}
                      onChange={(e) => setPrazoForm((f) => ({ ...f, titulo: e.target.value }))}
                      placeholder="Ex: Contestação, Audiência..." />
                  </label>
                  <label>Data de vencimento
                    <input type="date" value={prazoForm.dataVencimento}
                      onChange={(e) => setPrazoForm((f) => ({ ...f, dataVencimento: e.target.value }))} />
                  </label>
                  <div className="button-row">
                    <Button onClick={() => criarPrazo.mutate()}
                      disabled={!prazoForm.titulo.trim() || !prazoForm.dataVencimento || criarPrazo.isPending}>
                      {criarPrazo.isPending ? 'Salvando...' : 'Salvar prazo'}
                    </Button>
                    <Button variant="secondary" onClick={() => setAddingPrazo(false)}>Cancelar</Button>
                  </div>
                </div>
              </div>
            )}

            {proximoDeadline ? (
              <div className="ws-exec-card">
                <div className="ws-exec-card-inner">
                  <div>
                    <h3 style={{ fontSize: 16, marginBottom: 4 }}>{proximoDeadline.title}</h3>
                    <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                      {formatDate(proximoDeadline.dueDate)} · {proximoDeadline.businessDaysLeft} dias úteis
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    <span className={`badge ${proximoDeadline.priority === 'critical' ? 'badge-critical' : proximoDeadline.priority === 'attention' ? 'badge-attention' : 'badge-normal'}`}>
                      {proximoDeadline.priority === 'critical' ? 'Urgente' : proximoDeadline.priority === 'attention' ? 'Atenção' : 'Normal'}
                    </span>
                    {canAdvance && nextStage ? (
                      <Button onClick={() => avancarEtapa.mutate(nextStage.key)} disabled={avancarEtapa.isPending}>
                        <Play size={13} fill="currentColor" /> Avançar para {nextStage.label}
                      </Button>
                    ) : (
                      <Button onClick={() => navigate('/trabalho')}>
                        <Play size={13} fill="currentColor" /> Executar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : !addingPrazo ? (
              <div className="panel" style={{ padding: '20px 24px', textAlign: 'center' }}>
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>Nenhum prazo pendente para este caso.</p>
              </div>
            ) : null}
          </div>

          {/* DOCUMENTOS */}
          <div className="ws-section">
            <div className="ws-section-header">
              <p className="section-label">DOCUMENTOS</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" style={{ fontSize: 12, padding: '5px 12px' }}
                  onClick={() => navigate(`/cases/${id}/documentos`)}>
                  <FileText size={13} /> Gerenciar
                </Button>
                <Button variant="secondary" style={{ fontSize: 12, padding: '5px 12px' }}
                  onClick={() => setMostrarSeletorTipo(v => !v)}>
                  <Plus size={13} /> Adicionar
                </Button>
              </div>
            </div>

            <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt" onChange={onFileChange} />

            {mostrarSeletorTipo && (
              <div className="doc-tipo-picker">
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>Selecione o tipo:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {DOC_TIPOS.map((t) => (
                    <button key={t} className="doc-tipo-btn" onClick={() => abrirUpload(t)}>{t}</button>
                  ))}
                </div>
              </div>
            )}

            <p style={{ color: 'var(--muted)', fontSize: 13 }}>
              {docCount > 0 ? `${docCount} documento${docCount > 1 ? 's' : ''} anexado${docCount > 1 ? 's' : ''}.` : 'Nenhum documento anexado ainda.'}
            </p>

            {uploadDoc.isPending && (
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>Enviando documento...</p>
            )}
          </div>

          {/* PEÇAS */}
          <div className="ws-section">
            <div className="ws-section-header">
              <p className="section-label">PEÇAS JURÍDICAS</p>
              <Button
                style={{ fontSize: 12, padding: '5px 14px' }}
                onClick={() => podeGerarPecas ? navigate(`/cases/${id}/pecas`) : toast(bloqueioPecasHint, 'warning')}
                className={podeGerarPecas ? undefined : 'button-blocked'}
              >
                <Sparkles size={13} /> Gerar peça
              </Button>
            </div>
            {pecas.length === 0 ? (
              <div className="panel" style={{ padding: '20px 24px', textAlign: 'center' }}>
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>
                  {podeGerarPecas ? 'Nenhuma peça gerada ainda.' : bloqueioPecasHint}
                </p>
              </div>
            ) : (
              <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
                {pecas.map((p) => (
                  <div key={p.id} className="list-row" style={{ padding: '14px 20px' }}>
                    <div>
                      <strong>{p.categoria}</strong>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>v{p.versao} · {formatDate(p.createdAt)}</span>
                    </div>
                    <div className="button-row" style={{ margin: 0 }}>
                      <Button variant="secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => exportarWord(p)}>
                        <Download size={13} /> Word
                      </Button>
                      <Button variant="secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => navigate(`/cases/${id}/pecas`)}>
                        <Pencil size={13} /> Editar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ── Aside ── */}
        <div className="workspace-aside">

          {/* RESUMO DO CASO */}
          <div className="panel">
            <p className="section-label" style={{ marginBottom: 14 }}>RESUMO DO CASO</p>
            <dl className="definition-list" style={{ gap: 14 }}>
              <div>
                <dt>Status</dt>
                <dd><span className="badge badge-normal">{caseStatusLabel(legalCase.status)}</span></dd>
              </div>
              <div><dt>Cliente</dt><dd>{legalCase.clientName}</dd></div>
              {legalCase.tipoServico && <div><dt>Tipo</dt><dd>{legalCase.tipoServico}</dd></div>}
              {legalCase.tribunal && <div><dt>Tribunal</dt><dd>{legalCase.tribunal}</dd></div>}
              <div><dt>Área</dt><dd>{areaLabel(legalCase.area)}</dd></div>
              <div><dt>Atualizado</dt><dd>{formatDate(legalCase.updatedAt)}</dd></div>
            </dl>
          </div>

          {/* PRAZOS */}
          <div className="panel">
            <p className="section-label" style={{ marginBottom: 14 }}>PRAZOS</p>
            {pendingDeadlines.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>Nenhum prazo pendente.</p>
            ) : (
              <div className="list">
                {pendingDeadlines.slice(0, 3).map((d) => (
                  <div key={d.id} className={`list-row deadline-row-${d.priority}`}>
                    <div>
                      <strong style={{ fontSize: 13 }}>{d.title}</strong>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <time style={{ display: 'block', fontWeight: 700, fontSize: 13 }}>{formatDate(d.dueDate)}</time>
                      <span style={{ fontSize: 11, color: d.priority === 'critical' ? 'var(--danger)' : 'var(--muted)' }}>
                        {d.businessDaysLeft}d úteis
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FINANCEIRO */}
          <div className="panel">
            <p className="section-label" style={{ marginBottom: 14 }}>FINANCEIRO</p>
            <div className="finance-grid">
              <div className="finance-item">
                <span>Valor da causa</span>
                <strong>R$ {(legalCase.claimValue ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div className="finance-item">
                <span>Honorários</span>
                <strong>R$ {(legalCase.fees ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div className="finance-item">
                <span>Recebido</span>
                <strong style={{ color: 'var(--success)' }}>R$ {(legalCase.received ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div className="finance-item">
                <span>Pendente</span>
                <strong style={{ color: legalCase.pending > 0 ? 'var(--warning)' : 'var(--muted)' }}>
                  R$ {(legalCase.pending ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </strong>
              </div>
            </div>
          </div>

        </div>
       </>)}
      </div>
    </div>
  )
}
