import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarClock, CheckCircle2, Copy,
  FileText, Gavel, Pencil, PenLine, Plus,
  Share2, Star, Trash2, Upload, X, Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { caseStatusLabel, caseStatusOptions, formatDate, relativeTime } from '@/lib/utils'
import { casesService, type UpdateCasePatch } from '@/services/cases.service'
import { documentosService } from '@/services/documentos.service'
import { monitoringService } from '@/services/monitoring.service'
import { prazosService, type Prazo } from '@/services/prazos.service'
import { toast } from '@/store/toastStore'
import api from '@/lib/axios'
import type { CaseStatus, EtapaPipeline } from '@/types/domain.types'
import { PIPELINE, pipelineIndex } from '@/lib/pipeline'
import { PipelineStepper } from '@/components/case/PipelineStepper'
import { sanitizeHtml } from '@/lib/sanitize'

const STATUS_BADGE_CLASS: Record<CaseStatus, string> = {
  em_andamento: 'badge-success',
  aguardando_documentos: 'badge-warning',
  aguardando_prazo: 'badge-warning',
  finalizado: 'badge-info',
  arquivado: 'badge-normal',
}

/** "R$ 1.2M" / "R$ 120k" para caber em cards compactos. */
function compactCurrency(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`
  return `R$ ${v.toLocaleString('pt-BR')}`
}

const STAGE_SUBTITLE: Record<EtapaPipeline, string> = {
  cadastro: 'Preencha os dados essenciais do caso.',
  documentos: 'Anexe os documentos que embasam a peça.',
  pecas: 'Gere a peça jurídica com IA.',
  prazos: 'Acompanhe os prazos processuais do caso.',
  revisao: 'Valide a execução jurídica antes da conclusão.',
  protocolo: '',
  atualizacoes: '',
  encerramento: 'Finalize e arquive a execução.',
}

interface PecaGerada {
  id: string; casoId: string; categoria: string; conteudo: string; versao: number; createdAt: string
}

const DOC_TIPOS = ['Petição Inicial', 'Procuração', 'Contrato', 'Documentos pessoais', 'Comprovantes', 'Conversas', 'Outros anexos']

// O workspace do caso cabe numa tela só (sem scroll), então timeline e prazos mostram
// os itens mais relevantes e resumem o resto num "+N" — mesmo padrão do painel de Documentos.
const TIMELINE_VISIVEL = 3
const PRAZOS_VISIVEL = 4

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<UpdateCasePatch>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadTipoRef = useRef('')
  const [mostrarSeletorTipo, setMostrarSeletorTipo] = useState(false)
  const [buscaDoc, setBuscaDoc] = useState('')
  const [mostrarPrazoForm, setMostrarPrazoForm] = useState(false)
  const [prazoEditando, setPrazoEditando] = useState<Prazo | null>(null)
  const [prazoForm, setPrazoForm] = useState({ titulo: '', dataVencimento: '', responsavel: '', observacoes: '' })
  const [mostrarAndamentoForm, setMostrarAndamentoForm] = useState(false)
  const [confirmandoEncerramento, setConfirmandoEncerramento] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [andamentoTexto, setAndamentoTexto] = useState('')
  const [dragOverDocs, setDragOverDocs] = useState(false)
  const [viewOverride, setViewOverride] = useState<EtapaPipeline | null>(null)
  useEffect(() => { setViewOverride(null) }, [id])
  // Permite chegar direto numa etapa vindo de outra página (ex.: /cases/:id?view=revisao).
  useEffect(() => {
    const view = searchParams.get('view') as EtapaPipeline | null
    if (view && PIPELINE.some((s) => s.key === view)) {
      setViewOverride(view)
      setSearchParams((prev) => { prev.delete('view'); return prev }, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const { data: legalCase, isLoading } = useQuery({
    queryKey: ['case', id],
    queryFn: () => casesService.get(id!),
    enabled: !!id,
  })

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
  const { data: prazos = [] } = useQuery({
    queryKey: ['prazos', id],
    queryFn: () => prazosService.list(id!),
    enabled: !!id,
  })
  const { data: movimentacoes = [] } = useQuery({
    queryKey: ['movimentacoes', id],
    queryFn: () => monitoringService.list(id!),
    enabled: !!id,
  })

  const salvar = useMutation({
    mutationFn: () => casesService.update(id!, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['case', id] }); qc.invalidateQueries({ queryKey: ['cases'] }); setEditing(false) },
  })

  const excluir = useMutation({
    mutationFn: () => casesService.remove(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cases'] })
      toast('Caso excluído.', 'success')
      navigate(legalCase ? `/clientes/${legalCase.clienteId}` : '/')
    },
  })

  const avancarEtapa = useMutation({
    mutationFn: (etapa: EtapaPipeline) =>
      casesService.update(id!, etapa === 'encerramento' ? { etapaAtual: etapa, status: 'finalizado' } : { etapaAtual: etapa }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case', id] })
      qc.invalidateQueries({ queryKey: ['cases'] })
      setViewOverride(null)
      setConfirmandoEncerramento(false)
    },
  })

  // Encerrar o caso não navega pra nenhuma tela — é uma ação direta (com confirmação,
  // já que muda o status pra finalizado) que só atualiza o caso no lugar.
  function handleAvancar() {
    if (avancarEtapa.isPending || !nextStage) return
    if (!canAdvance) { toast(currentReq.hint, 'warning'); return }
    if (nextStage.key === 'encerramento') { setConfirmandoEncerramento(true); return }
    avancarEtapa.mutate(nextStage.key)
  }

  const uploadDoc = useMutation({
    mutationFn: ({ file, tipo }: { file: File; tipo: string }) => documentosService.upload(id!, file, tipo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documentos', id] }),
  })

  const salvarPrazo = useMutation({
    mutationFn: () => {
      const payload = {
        titulo: prazoForm.titulo,
        dataVencimento: new Date(prazoForm.dataVencimento).toISOString(),
        responsavel: prazoForm.responsavel || null,
        observacoes: prazoForm.observacoes || null,
      }
      return prazoEditando
        ? prazosService.update(prazoEditando.id, payload)
        : prazosService.create({ casoId: id!, ...payload })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prazos', id] })
      setMostrarPrazoForm(false)
      setPrazoEditando(null)
      setPrazoForm({ titulo: '', dataVencimento: '', responsavel: '', observacoes: '' })
    },
  })

  const concluirPrazo = useMutation({
    mutationFn: (prazo: Prazo) => prazosService.update(prazo.id, { concluido: !prazo.concluido }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prazos', id] }),
  })

  const removerPrazo = useMutation({
    mutationFn: (prazoId: string) => prazosService.remove(prazoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prazos', id] }),
  })

  const registrarAndamento = useMutation({
    mutationFn: () => monitoringService.registrarManual(id!, andamentoTexto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movimentacoes', id] })
      setMostrarAndamentoForm(false)
      setAndamentoTexto('')
      toast('Andamento registrado.', 'success')
    },
  })

  function abrirNovoPrazo() {
    setPrazoEditando(null)
    setPrazoForm({ titulo: '', dataVencimento: '', responsavel: '', observacoes: '' })
    setMostrarPrazoForm(true)
  }

  function abrirEdicaoPrazo(prazo: Prazo) {
    setPrazoEditando(prazo)
    setPrazoForm({
      titulo: prazo.titulo,
      dataVencimento: prazo.dataVencimento.slice(0, 10),
      responsavel: prazo.responsavel ?? '',
      observacoes: prazo.observacoes ?? '',
    })
    setMostrarPrazoForm(true)
  }

  // ── Gating do pipeline: cada etapa só libera a próxima se o requisito for cumprido ──
  const hasPeca = pecas.length >= 1
  // Documentos não são mais obrigatórios para gerar peças.
  const podeGerarPecas = true
  const bloqueioPecasHint = ''

  const stageReq: Record<EtapaPipeline, { met: boolean; hint: string }> = {
    cadastro:     { met: true, hint: '' },
    documentos:   { met: true, hint: '' },
    pecas:        { met: hasPeca, hint: 'Gere pelo menos 1 peça para avançar.' },
    prazos:       { met: true, hint: '' },
    revisao:      { met: hasPeca, hint: 'É preciso ter uma peça para revisar.' },
    protocolo:    { met: true, hint: '' },
    atualizacoes: { met: true, hint: '' },
    encerramento: { met: true, hint: '' },
  }

  // Caso já criado ⇒ Cadastro conta como concluído; corrente começa em Documentos.
  // pipelineIndex traduz etapas legadas ('prazos', 'revisao') pra esteira atual.
  const storedIdx = pipelineIndex(legalCase?.etapaAtual)

  // A etapa salva só avança quando o usuário clica em "Avançar", mas o progresso real
  // (documentos anexados, peça gerada...) pode já estar mais adiantado — segue o requisito
  // real de cada etapa em vez de travar no valor salvo. "Encerramento" nunca é automático,
  // é sempre uma ação explícita (ver handleAvancar / confirmandoEncerramento).
  let derivedIdx = PIPELINE.length - 2 // Gerar Peças: teto padrão até o usuário encerrar de propósito
  for (let i = 1; i < PIPELINE.length - 1; i++) {
    if (!stageReq[PIPELINE[i].key].met) { derivedIdx = i; break }
  }

  const currentPipelineIdx = Math.max(1, storedIdx, derivedIdx)
  const currentStage = PIPELINE[currentPipelineIdx]
  const currentReq = stageReq[currentStage.key]
  const canAdvance = currentReq.met
  const nextStage = PIPELINE[currentPipelineIdx + 1] ?? null

  // ── Navegação livre pela pipeline: o usuário pode ir e voltar entre qualquer
  // etapa já alcançada (idx <= currentPipelineIdx), sem perder o progresso real. ──
  const NAV_ROUTES: Partial<Record<EtapaPipeline, string>> = {
    documentos: `/cases/${id}/documentos`,
    pecas: `/cases/${id}/pecas`,
  }
  const viewedIdx = viewOverride ? PIPELINE.findIndex((s) => s.key === viewOverride) : currentPipelineIdx
  const displayStage = viewedIdx >= 0 ? PIPELINE[viewedIdx] : currentStage

  function irParaEtapa(key: EtapaPipeline) {
    const idx = PIPELINE.findIndex((s) => s.key === key)
    if (idx < 0 || idx > currentPipelineIdx) return // etapa bloqueada, ignora
    const rota = NAV_ROUTES[key]
    if (rota) navigate(rota)
    else setViewOverride(key === currentStage.key ? null : key)
  }

  function irParaIdx(idx: number) {
    const stage = PIPELINE[idx]
    if (stage) irParaEtapa(stage.key)
  }
  const podeVoltarEtapa = viewedIdx > 0
  const podeAvancarEtapaView = viewedIdx < currentPipelineIdx

  // ── Visão padrão do workspace: progresso e timeline real do caso ──
  const progressoPct = Math.round((currentPipelineIdx / (PIPELINE.length - 1)) * 100)

  const timeline = legalCase ? [
    { quando: legalCase.createdAt, titulo: 'Cadastramento do Caso', descricao: 'Cliente registrado e dados iniciais coletados.', icon: Pencil },
    ...documentos.map((d) => ({ quando: d.createdAt, titulo: 'Documento anexado', descricao: d.nomeArquivo, icon: Upload })),
    ...pecas.map((p) => ({ quando: p.createdAt, titulo: 'Peça gerada', descricao: `${p.categoria} v${p.versao}`, icon: FileText })),
    ...movimentacoes.map((m) => ({
      quando: m.date,
      titulo: m.source === 'manual' ? 'Andamento registrado' : 'Movimentação processual',
      descricao: m.description,
      icon: m.source === 'manual' ? PenLine : Gavel,
    })),
    ...prazos.map((p) => ({ quando: p.createdAt, titulo: 'Prazo cadastrado', descricao: `${p.titulo} — vence em ${formatDate(p.dataVencimento)}`, icon: CalendarClock })),
  ].sort((a, b) => new Date(a.quando).getTime() - new Date(b.quando).getTime()) : []

  const documentosFiltrados = buscaDoc.trim()
    ? documentos.filter((d) => d.nomeArquivo.toLowerCase().includes(buscaDoc.trim().toLowerCase()))
    : documentos

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
      favorito: legalCase.favorito,
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

  function onDropDocs(e: React.DragEvent<HTMLElement>) {
    e.preventDefault()
    setDragOverDocs(false)
    const files = Array.from(e.dataTransfer.files ?? [])
    files.forEach((file) => uploadDoc.mutate({ file, tipo: 'Outros' }))
  }

  function copiarPeca(peca: PecaGerada) {
    const tmp = document.createElement('div')
    tmp.innerHTML = peca.conteudo
    navigator.clipboard.writeText(tmp.innerText)
    toast('Conteúdo da peça copiado.', 'success')
  }

  if (isLoading) return <div className="screen-loader">Carregando caso...</div>
  if (!legalCase) return <div className="page-stack"><p>Caso não encontrado.</p></div>

  return (
    <div className="workspace-layout">

      {/* ── Header ── */}
      <div className="case-workspace-header">
        <div className="case-breadcrumb">
          <Link to="/clientes">Clientes</Link>
          <span>›</span>
          <Link to={`/clientes/${legalCase.clienteId}`}>{legalCase.clientName}</Link>
          <span>›</span>
          <strong>Processo #{legalCase.protocolo} - {legalCase.title || legalCase.clientName}</strong>
        </div>

        <label className="case-search-box">
          <FileText size={14} />
          <input
            type="text"
            placeholder="Buscar no caso..."
            value={buscaDoc}
            onChange={(e) => setBuscaDoc(e.target.value)}
          />
        </label>

        <div className="case-header-actions">
          <button
            className="case-icon-btn"
            aria-label="Compartilhar"
            title="Compartilhar"
            onClick={() => toast('Compartilhamento ainda não está disponível.', 'info')}
          >
            <Share2 size={16} />
          </button>
          <button className="case-icon-btn" aria-label="Editar caso" title="Editar caso" onClick={startEdit}>
            <Pencil size={16} />
          </button>
          <button
            className="case-icon-btn"
            aria-label="Novo processo para este cliente"
            title="Novo processo para este cliente"
            onClick={() => navigate(`/cases/new?clienteId=${legalCase.clienteId}&clienteNome=${encodeURIComponent(legalCase.clientName)}`)}
          >
            <Plus size={16} />
          </button>
          {nextStage && nextStage.key !== 'encerramento' ? (
            <Button
              className="case-primary-cta"
              onClick={handleAvancar}
              title={!canAdvance ? currentReq.hint : undefined}
            >
              <Zap size={15} /> {avancarEtapa.isPending ? 'Executando...' : 'Executar Próxima Ação'}
            </Button>
          ) : !nextStage ? (
            <Button
              onClick={() => podeGerarPecas ? navigate(`/cases/${id}/pecas`) : toast(bloqueioPecasHint, 'warning')}
              className={podeGerarPecas ? undefined : 'button-blocked'}
            >
              Peças com IA
            </Button>
          ) : null}
        </div>
      </div>

      {/* ── Pipeline (stepper numerado) ── */}
      <PipelineStepper
        label={displayStage.label}
        subtitle={STAGE_SUBTITLE[displayStage.key]}
        viewedIdx={viewedIdx}
        currentPipelineIdx={currentPipelineIdx}
        progressoPct={progressoPct}
        podeVoltar={podeVoltarEtapa}
        podeAvancarView={podeAvancarEtapaView}
        onIrParaIdx={irParaIdx}
        onIrParaEtapa={irParaEtapa}
        proximaEtapaLabel={nextStage?.label}
        podeAvancarEtapa={canAdvance}
        avancarHint={currentReq.hint}
        onAvancarEtapa={handleAvancar}
      />

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
            <label className="nc-favorito-toggle" style={{ fontSize: 14 }}>
              <input
                type="checkbox"
                checked={form.favorito ?? false}
                onChange={(e) => setForm({ ...form, favorito: e.target.checked })}
              />
              <Star size={14} fill={form.favorito ? 'currentColor' : 'none'} />
              Marcar como favorito
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
        <div className="case-workspace-default">
        <div className="panel case-info-bar">
          <div className="case-info-row">
            <div><span>PROCESSO</span><strong className="mono">{legalCase.caseNumber ?? '—'}</strong></div>
            <div><span>CLIENTE</span><strong>{legalCase.clientName}</strong></div>
            <div><span>PARTE CONTRÁRIA</span><strong>{legalCase.reuNome ?? '—'}</strong></div>
            <div><span>VALOR DA CAUSA</span><strong className="text-primary">{compactCurrency(legalCase.claimValue)}</strong></div>
          </div>
          <div className="case-info-row">
            <div><span>VARA</span><strong>{legalCase.vara ?? legalCase.tribunal ?? '—'}</strong></div>
            <div><span>ÚLTIMA ATUALIZAÇÃO</span><strong>{relativeTime(legalCase.updatedAt)}</strong></div>
            <div><span>STATUS</span><span className={`badge ${STATUS_BADGE_CLASS[legalCase.status]}`}>{caseStatusLabel(legalCase.status)}</span></div>
            <button className="case-archive-link" onClick={() => setConfirmandoExclusao(true)}>
              <Trash2 size={12} /> Excluir caso
            </button>
          </div>
        </div>

        <div className="case-workspace-grid">
        {/* ── Coluna esquerda: peça gerada (visualizar/editar) ── */}
        <div className="case-col case-col-left">
          <div className="panel case-doc-preview">
            {pecas[0] ? (
              <>
                <div className="case-doc-preview-head">
                  <div className="case-doc-preview-title-row">
                    <strong>{pecas[0].categoria.replace(/\s+/g, '_')}_V{pecas[0].versao}</strong>
                  </div>
                  <div className="case-doc-preview-tags">
                    <span className="case-doc-tag">{pecas[0].categoria}</span>
                    <span className="case-doc-tag">Versão {pecas[0].versao}</span>
                    <span className="case-doc-tag ok"><span className="live-dot-mini" /> Salvo</span>
                  </div>
                </div>
                <div className="case-doc-preview-body" dangerouslySetInnerHTML={{ __html: sanitizeHtml(pecas[0].conteudo) }} />
                <div className="case-doc-preview-actions">
                  <Button variant="secondary" onClick={() => navigate(`/cases/${id}/pecas`)}>Abrir Editor</Button>
                  <Button onClick={() => navigate(`/cases/${id}/pecas`)}>Gerar Peça</Button>
                  <button className="case-icon-btn" onClick={() => copiarPeca(pecas[0])} title="Copiar conteúdo">
                    <Copy size={15} />
                  </button>
                </div>
              </>
            ) : (
              <div className="panel-empty">
                <FileText size={26} />
                <span>{podeGerarPecas ? 'Nenhuma peça gerada ainda.' : bloqueioPecasHint}</span>
                {podeGerarPecas && (
                  <Button onClick={() => navigate(`/cases/${id}/pecas`)}>Executar a Orbian</Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Coluna central: timeline do caso ── */}
        <div className="case-col case-col-main">
          <div className="panel case-timeline-panel">
            <div className="ws-section-header">
              <p className="section-label" style={{ margin: 0 }}>TIMELINE DO CASO</p>
              {timeline.length > TIMELINE_VISIVEL && (
                <span className="case-list-more" style={{ margin: 0 }}>
                  +{timeline.length - TIMELINE_VISIVEL} anterior{timeline.length - TIMELINE_VISIVEL !== 1 ? 'es' : ''}
                </span>
              )}
            </div>
            {timeline.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>Nenhum evento registrado ainda.</p>
            ) : (
              <>
                <ul className="case-timeline">
                  {timeline.slice(-TIMELINE_VISIVEL).map((ev, i) => {
                    const EvIcon = ev.icon
                    return (
                      <li key={i} title={`${ev.titulo} — ${ev.descricao}`}>
                        <span className="case-timeline-icon"><EvIcon size={13} /></span>
                        <strong>{ev.titulo}</strong>
                        <span className="case-timeline-desc">{ev.descricao}</span>
                        <span className="case-timeline-date">{formatDate(ev.quando)}</span>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </div>

          <div
            className={`panel doc-list-card ${dragOverDocs ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOverDocs(true) }}
            onDragLeave={() => setDragOverDocs(false)}
            onDrop={onDropDocs}
          >
            <div className="ws-section-header">
              <p className="section-label">DOCUMENTOS</p>
              <button className="section-link-btn" onClick={() => setMostrarSeletorTipo((v) => !v)}>
                <Upload size={13} /> Novo Upload
              </button>
            </div>
            {documentosFiltrados.length > 0 && (
              <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '-4px 0 8px' }}>Arraste arquivos aqui para anexar rapidamente.</p>
            )}

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
            {uploadDoc.isPending && (
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Enviando documento...</p>
            )}

            {documentosFiltrados.length === 0 ? (
              <div className="panel-empty">
                <FileText size={22} />
                <span>{buscaDoc ? 'Nenhum documento encontrado para essa busca.' : 'Nenhum documento anexado ainda.'}</span>
              </div>
            ) : (
              <div className="case-doc-grid">
                {documentosFiltrados.slice(0, 4).map((d) => (
                  <div key={d.id} className="case-doc-card">
                    <span className="case-doc-card-icon"><FileText size={16} /></span>
                    <div>
                      <strong>{d.nomeArquivo}</strong>
                      <span>{formatDate(d.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {documentosFiltrados.length > 4 && (
              <button className="case-doc-more" onClick={() => navigate(`/cases/${id}/documentos`)}>
                +{documentosFiltrados.length - 4} documentos arquivados
              </button>
            )}
          </div>
        </div>

        {/* ── Coluna direita: quadro de prazos ── */}
        <div className="case-col case-col-right">
          <div className="panel case-prazos-panel">
            <div className="ws-section-header">
              <p className="section-label" style={{ margin: 0 }}>PRAZOS DO CASO</p>
              <Button className="case-add-prazo-btn" onClick={abrirNovoPrazo} style={{ fontSize: 12, padding: '6px 12px' }}>
                <Plus size={13} /> Adicionar Prazo
              </Button>
            </div>

            {prazos.length === 0 ? (
              <div className="panel-empty">
                <CalendarClock size={22} />
                <span>Nenhum prazo cadastrado ainda.</span>
              </div>
            ) : (
              <ul className="case-prazo-list">
                {prazos.slice(0, PRAZOS_VISIVEL).map((p) => (
                  <li key={p.id} className={`case-prazo-row status-${p.status}`}>
                    <div>
                      <strong className={p.concluido ? 'strike' : ''}>{p.titulo}</strong>
                      <span>{formatDate(p.dataVencimento)}{p.responsavel ? ` · ${p.responsavel}` : ''}</span>
                    </div>
                    <div className="case-prazo-actions">
                      <span className={`case-prazo-badge ${p.status}`}>{p.concluido ? 'Concluído' : `${p.diasUteisRestantes}d úteis`}</span>
                      <button className="case-icon-btn" title={p.concluido ? 'Reabrir' : 'Concluir'} onClick={() => concluirPrazo.mutate(p)}>
                        <CheckCircle2 size={14} />
                      </button>
                      <button className="case-icon-btn" title="Editar" onClick={() => abrirEdicaoPrazo(p)}>
                        <Pencil size={14} />
                      </button>
                      <button className="case-icon-btn" title="Remover" onClick={() => removerPrazo.mutate(p.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {prazos.length > PRAZOS_VISIVEL && (
              <span className="case-list-more">+{prazos.length - PRAZOS_VISIVEL} prazo{prazos.length - PRAZOS_VISIVEL !== 1 ? 's' : ''} cadastrado{prazos.length - PRAZOS_VISIVEL !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
        </div>

        {/* ── Barra de ações ── */}
        <div className="case-workspace-actionbar">
          <Button variant="secondary" onClick={() => setMostrarSeletorTipo(true)}><Upload size={14} /> Adicionar Documento</Button>
          <Button variant="secondary" onClick={() => setMostrarAndamentoForm((v) => !v)}><PenLine size={14} /> Registrar Andamento</Button>
          <Button variant="secondary" onClick={abrirNovoPrazo}><CalendarClock size={14} /> Atualizar Prazo</Button>
          <Button variant="secondary" onClick={() => toast('Compartilhamento ainda não está disponível.', 'info')}><Share2 size={14} /> Compartilhar Resumo</Button>
        </div>

        {mostrarAndamentoForm && (
          <div className="panel case-andamento-form">
            <div className="ws-section-header">
              <p className="section-label" style={{ margin: 0 }}>REGISTRAR ANDAMENTO</p>
              <button className="case-icon-btn" onClick={() => setMostrarAndamentoForm(false)}><X size={14} /></button>
            </div>
            <textarea
              rows={2}
              placeholder="Ex.: Cliente contatado por telefone, audiência remarcada..."
              value={andamentoTexto}
              onChange={(e) => setAndamentoTexto(e.target.value)}
            />
            <div className="button-row">
              <Button onClick={() => registrarAndamento.mutate()} disabled={!andamentoTexto.trim() || registrarAndamento.isPending}>
                {registrarAndamento.isPending ? 'Registrando...' : 'Registrar'}
              </Button>
            </div>
          </div>
        )}
        </div>
      </div>

      {mostrarPrazoForm && (
        <div className="confirm-dialog-overlay" onClick={() => { setMostrarPrazoForm(false); setPrazoEditando(null) }}>
          <div className="confirm-dialog confirm-dialog-wide" style={{ textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
            <p className="section-label" style={{ marginBottom: 14 }}>{prazoEditando ? 'EDITAR PRAZO' : 'ADICIONAR PRAZO'}</p>
            <label className="nc-field" style={{ marginTop: 0 }}>Título<input value={prazoForm.titulo} onChange={(e) => setPrazoForm({ ...prazoForm, titulo: e.target.value })} placeholder="Ex: Contestação" /></label>
            <div className="nc-field-pair">
              <label className="nc-field">Vencimento<input type="date" value={prazoForm.dataVencimento} onChange={(e) => setPrazoForm({ ...prazoForm, dataVencimento: e.target.value })} /></label>
              <label className="nc-field">Responsável<input value={prazoForm.responsavel} onChange={(e) => setPrazoForm({ ...prazoForm, responsavel: e.target.value })} /></label>
            </div>
            <label className="nc-field">Observações<textarea rows={2} value={prazoForm.observacoes} onChange={(e) => setPrazoForm({ ...prazoForm, observacoes: e.target.value })} /></label>
            <div className="confirm-dialog-actions">
              <Button variant="secondary" onClick={() => { setMostrarPrazoForm(false); setPrazoEditando(null) }}>Cancelar</Button>
              <Button
                onClick={() => salvarPrazo.mutate()}
                disabled={!prazoForm.titulo || !prazoForm.dataVencimento || salvarPrazo.isPending}
              >
                {salvarPrazo.isPending ? 'Salvando...' : prazoEditando ? 'Salvar alterações' : 'Adicionar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmandoEncerramento}
        title={`Encerrar "${legalCase.title || legalCase.clientName}"?`}
        description="O caso será marcado como finalizado. Você ainda pode reabri-lo depois, se precisar."
        confirmLabel="Encerrar Caso"
        loading={avancarEtapa.isPending}
        onConfirm={() => avancarEtapa.mutate('encerramento')}
        onCancel={() => setConfirmandoEncerramento(false)}
      />

      <ConfirmDialog
        open={confirmandoExclusao}
        title={`Excluir "${legalCase.title || legalCase.clientName}"?`}
        description="Essa ação apaga o caso e todos os documentos, peças e prazos vinculados a ele, de forma permanente. Não é possível desfazer."
        confirmLabel="Excluir Caso"
        danger
        loading={excluir.isPending}
        onConfirm={() => excluir.mutate()}
        onCancel={() => setConfirmandoExclusao(false)}
      />
    </div>
  )
}
