import { useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle, Archive, CheckCircle2, Circle, Copy,
  FileText, Lightbulb, Link2, Lock, Pencil, PenLine, Play, Plus,
  Rocket, Share2, ShieldCheck, Sparkles, Star, Upload, Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { areaLabel, caseStatusLabel, caseStatusOptions, formatDate } from '@/lib/utils'
import { casesService, type UpdateCasePatch } from '@/services/cases.service'
import { deadlinesService } from '@/services/deadlines.service'
import { documentosService } from '@/services/documentos.service'
import { toast } from '@/store/toastStore'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/axios'
import type { EtapaPipeline } from '@/types/domain.types'
import { extrairSecaoHtml, MODULOS_PECA } from '@/lib/pecaSections'

const PROXIMA_ACAO: Record<EtapaPipeline, string> = {
  cadastro: 'Completar cadastro do caso',
  documentos: 'Anexar documentos obrigatórios',
  pecas: 'Gerar petição inicial',
  prazos: 'Cadastrar prazo do processo',
  revisao: 'Revisar execução',
  protocolo: 'Revisar execução',
  atualizacoes: 'Revisar execução',
  encerramento: 'Finalizar caso',
}

/** "há 12 min" / "há 4h" / "há 2d" a partir de um timestamp ISO. */
function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'agora mesmo'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  return `há ${d}d`
}

function initialsOf(name?: string) {
  if (!name) return '—'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

/** "R$ 1.2M" / "R$ 120k" para caber em cards compactos. */
function compactCurrency(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`
  return `R$ ${v.toLocaleString('pt-BR')}`
}

/** "18:00" quando o prazo tem horário definido; senão "Hoje". */
function horaPrazo(iso: string) {
  const d = new Date(iso)
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0
  return hasTime ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Hoje'
}

const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI']

const STAGE_SUBTITLE: Record<EtapaPipeline, string> = {
  cadastro: 'Preencha os dados essenciais do caso.',
  documentos: 'Anexe os documentos que embasam a peça.',
  pecas: 'Gere a peça jurídica com IA.',
  prazos: 'Cadastre os prazos do processo.',
  revisao: 'Valide a execução jurídica antes da conclusão.',
  protocolo: '',
  atualizacoes: '',
  encerramento: 'Finalize e arquive a execução.',
}

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
  const [buscaDoc, setBuscaDoc] = useState('')
  const user = useAuthStore((s) => s.user)

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

  const reabrir = useMutation({
    mutationFn: () => casesService.update(id!, { status: 'em_andamento' }),
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

  // A etapa salva só avança quando o usuário clica em "Avançar", mas o progresso real
  // (documentos anexados, peça gerada...) pode já estar mais adiantado — segue o requisito
  // real de cada etapa em vez de travar no valor salvo. "Encerramento" nunca é automático.
  let derivedIdx = PIPELINE.length - 2 // Revisão: padrão quando tudo antes dela já foi cumprido
  for (let i = 1; i < PIPELINE.length - 1; i++) {
    if (!stageReq[PIPELINE[i].key].met) { derivedIdx = i; break }
  }

  const currentPipelineIdx = Math.max(1, storedIdx, derivedIdx)
  const currentStage = PIPELINE[currentPipelineIdx]
  const currentReq = stageReq[currentStage.key]
  const canAdvance = currentReq.met
  const nextStage = PIPELINE[currentPipelineIdx + 1] ?? null

  // ── Arquivamento: chega por duas portas — o advogado arquivou manualmente,
  // ou o caso já passou pelo Encerramento e todos os prazos já expiraram. ──
  const todosPrazosExpirados = caseDeadlines.length > 0 && caseDeadlines.every((d) => new Date(d.dueDate) < new Date())
  const arquivadoManualmente = legalCase?.status === 'arquivado'
  const mostrarArquivamento = arquivadoManualmente || (currentStage.key === 'encerramento' && todosPrazosExpirados)
  const tempoTotalDias = legalCase
    ? Math.max(1, Math.round((new Date(legalCase.updatedAt).getTime() - new Date(legalCase.createdAt).getTime()) / 86400000))
    : 0

  // ── Auditoria (tela de Revisão): só sinais reais, nada simulado ──
  const dadosFields = [legalCase?.caseNumber, legalCase?.tribunal, legalCase?.area, legalCase?.clientName]
  const dadosPreenchidosCount = dadosFields.filter(Boolean).length
  const dadosOk = dadosPreenchidosCount === dadosFields.length
  const contextoInformado = Boolean(legalCase?.resumoFatos || legalCase?.pedidosProvidencias)

  // ── Estrutura da peça principal (para a tela de Revisão) ──
  const pecaRevisao = pecas[0]
  const secoesPeca = pecaRevisao
    ? MODULOS_PECA.map((m) => ({ ...m, html: extrairSecaoHtml(pecaRevisao.conteudo, m.termos) }))
    : []
  const secoesOkCount = secoesPeca.filter((s) => s.html !== null).length
  const estruturaCompleta = pecaRevisao ? secoesOkCount === MODULOS_PECA.length : false
  const secoesFaltando = secoesPeca.filter((s) => s.html === null).map((s) => s.nome)

  // ── Visão padrão do workspace: progresso, prazos agrupados, sugestões e atividade real ──
  const progressoPct = Math.round((currentPipelineIdx / (PIPELINE.length - 1)) * 100)

  const isHoje = (dueDate: string) => new Date(dueDate).toDateString() === new Date().toDateString()
  const prazosHoje = pendingDeadlines.filter((d) => isHoje(d.dueDate))
  const prazosProximos = pendingDeadlines
    .filter((d) => !isHoje(d.dueDate))
    .filter((d) => {
      const dias = Math.ceil((new Date(d.dueDate).getTime() - new Date().getTime()) / 86400000)
      return dias > 0 && dias <= 7
    })

  const sugestoes: { texto: string; acaoLabel: string; onClick: () => void }[] = []
  if (proximoDeadline) {
    const urgente = proximoDeadline.priority === 'critical' || isHoje(proximoDeadline.dueDate)
    if (urgente) {
      sugestoes.push({
        texto: `Prazo "${proximoDeadline.title}" vence ${isHoje(proximoDeadline.dueDate) ? 'hoje' : formatDate(proximoDeadline.dueDate)}.`,
        acaoLabel: 'VER PRAZOS',
        onClick: () => navigate('/deadlines'),
      })
    }
  }
  if (podeGerarPecas && !hasPeca) {
    sugestoes.push({
      texto: 'Documentos prontos, mas nenhuma peça foi gerada ainda.',
      acaoLabel: 'GERAR PEÇA',
      onClick: () => navigate(`/cases/${id}/pecas`),
    })
  } else if (hasPeca && !estruturaCompleta) {
    sugestoes.push({
      texto: `A peça tem ${secoesFaltando.length} seção(ões) pendente(s) de revisão.`,
      acaoLabel: 'ABRIR PEÇA',
      onClick: () => navigate(`/cases/${id}/pecas`),
    })
  }
  if (sugestoes.length === 0) {
    sugestoes.push({ texto: 'Nenhuma pendência crítica identificada neste momento.', acaoLabel: '', onClick: () => {} })
  }

  const atividade = [
    ...documentos.map((d) => ({ texto: `Documento anexado: ${d.nomeArquivo}`, quando: d.createdAt })),
    ...pecas.map((p) => ({ texto: `Peça gerada: ${p.categoria} v${p.versao}`, quando: p.createdAt })),
  ].sort((a, b) => new Date(b.quando).getTime() - new Date(a.quando).getTime()).slice(0, 5)

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

  function exportarWord(peca: PecaGerada) {
    const html = `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"/></head><body>${peca.conteudo}</body></html>`
    const blob = new Blob([html], { type: 'application/msword' })
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${peca.categoria}_v${peca.versao}.doc` })
    a.click(); URL.revokeObjectURL(a.href)
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
          <Link to="/cases">Casos</Link>
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
          {nextStage ? (
            <Button
              onClick={() => canAdvance && avancarEtapa.mutate(nextStage.key)}
              disabled={!canAdvance || avancarEtapa.isPending}
              title={!canAdvance ? currentReq.hint : undefined}
            >
              <Zap size={15} /> Executar Próxima Ação
            </Button>
          ) : (
            <Button
              onClick={() => podeGerarPecas ? navigate(`/cases/${id}/pecas`) : toast(bloqueioPecasHint, 'warning')}
              className={podeGerarPecas ? undefined : 'button-blocked'}
            >
              <Sparkles size={16} /> Peças com IA
            </Button>
          )}
        </div>
      </div>

      {/* ── Pipeline (stepper numerado) ── */}
      <div className="workspace-pipeline">
        <div className="case-stage-head">
          <h2>{currentStage.label} <span className="case-stage-badge">STAGE {currentPipelineIdx + 1}</span></h2>
          {STAGE_SUBTITLE[currentStage.key] && <p>{STAGE_SUBTITLE[currentStage.key]}</p>}
        </div>
        <span className="case-progress-pct">{progressoPct}% concluído</span>
        <nav className="case-stepper">
          {PIPELINE.map((stage, idx) => {
            const done = idx < currentPipelineIdx
            const active = idx === currentPipelineIdx
            const locked = idx > currentPipelineIdx
            const cls = ['case-step', done && 'done', active && 'active', locked && 'locked'].filter(Boolean).join(' ')
            return (
              <div key={stage.key} className={cls}>
                <span className="case-step-dot">
                  {done ? <CheckCircle2 size={14} /> : locked ? <Lock size={11} /> : idx + 1}
                </span>
                <span className="case-step-label">{stage.label}</span>
              </div>
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
       {currentStage.key === 'revisao' ? (
        <div className="review-layout-v2">

          {/* RESUMO + CHECKLIST */}
          <div className="panel review-aside">
            <div className="review-status-tile">
              <span className="review-status-label">STATUS GERAL</span>
              <strong>{secoesOkCount}/{MODULOS_PECA.length}</strong>
              <span className="review-status-sub">Blocos OK</span>
            </div>

            <dl className="definition-list" style={{ gap: 12, marginTop: 18 }}>
              <div><dt>Documentos</dt><dd>{docCount} vinculado{docCount !== 1 ? 's' : ''}</dd></div>
              <div><dt>Referência</dt><dd className="text-primary">ID #{legalCase.protocolo}</dd></div>
            </dl>

            <p className="section-label" style={{ margin: '20px 0 12px' }}>RESUMO DA EXECUÇÃO</p>
            <dl className="definition-list" style={{ gap: 12 }}>
              <div><dt>Cliente</dt><dd>{legalCase.clientName}</dd></div>
              {legalCase.tribunal && <div><dt>Tribunal</dt><dd>{legalCase.tribunal}</dd></div>}
              <div><dt>Área</dt><dd>{areaLabel(legalCase.area)}</dd></div>
              <div><dt>Atualizado</dt><dd>{formatDate(legalCase.updatedAt)}</dd></div>
            </dl>

            <p className="section-label" style={{ margin: '20px 0 12px' }}>CHECKLIST DE INTEGRIDADE</p>
            <ul className="review-timeline">
              <li className={dadosOk ? 'done' : ''}>{dadosOk ? <CheckCircle2 size={14} /> : <Circle size={14} />} Cadastro completo</li>
              <li className={docCount > 0 ? 'done' : ''}>{docCount > 0 ? <CheckCircle2 size={14} /> : <Circle size={14} />} Documentos vinculados</li>
              <li className={contextoInformado ? 'done' : ''}>{contextoInformado ? <CheckCircle2 size={14} /> : <Circle size={14} />} Contexto informado</li>
              <li className={hasPeca ? 'done' : ''}>{hasPeca ? <CheckCircle2 size={14} /> : <Circle size={14} />} Peça construída</li>
              <li><Circle size={14} /> Revisão concluída</li>
            </ul>
          </div>

          {/* PRÉVIA DA PEÇA, SEÇÃO A SEÇÃO */}
          <div className="review-doc-preview">
            {pecaRevisao ? (
              <>
                <div className="review-doc-accent" />
                <div className="review-doc-head">
                  <span className="review-doc-label">{pecaRevisao.categoria.toUpperCase()}</span>
                  <span className={`review-doc-tag ${estruturaCompleta ? 'ok' : 'warn'}`}>
                    {estruturaCompleta ? 'Estrutura OK' : 'Pendências na estrutura'}
                  </span>
                </div>

                {secoesPeca.map((secao, i) => (
                  <div key={secao.nome} className={`review-section-block ${secao.html ? '' : 'attention'}`}>
                    <div className="review-section-head">
                      <strong>{ROMANOS[i]}. {secao.nome}</strong>
                      <span className={`review-section-tag ${secao.html ? 'ok' : 'warn'}`}>
                        {secao.html ? <><CheckCircle2 size={12} /> Revisado</> : <><AlertTriangle size={12} /> Necessita atenção</>}
                      </span>
                    </div>
                    {secao.html ? (
                      <div dangerouslySetInnerHTML={{ __html: secao.html }} />
                    ) : (
                      <p className="review-section-missing">Esta seção não foi identificada no texto gerado. Abra a peça e ajuste manualmente ou peça à IA para completá-la.</p>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <div className="panel-empty">
                <FileText size={26} />
                <span>Nenhuma peça gerada para revisar ainda.</span>
              </div>
            )}
          </div>

          {/* ORBIAN INTELLIGENCE */}
          <div className="ia-panel orbian-intel review-intel">
            <div className="ia-panel-head">
              <span className="ia-panel-icon"><Sparkles size={16} /></span>
              <strong>Orbian Intelligence</strong>
            </div>

            <p className="section-label" style={{ margin: '4px 0 10px', color: 'rgba(255,255,255,0.5)' }}>VALIDATION CHECKS</p>
            <div className="intel-check">
              <span className={`intel-check-icon ${estruturaCompleta ? 'ok' : 'warn'}`}>
                {estruturaCompleta ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              </span>
              <div>
                <strong>Estrutura Completa</strong>
                <span>{estruturaCompleta ? 'Nenhum bloco obrigatório ausente' : `${secoesFaltando.length} bloco(s) ausente(s)`}</span>
              </div>
            </div>
            <div className="intel-check">
              <span className={`intel-check-icon ${docCount > 0 ? 'ok' : 'warn'}`}><Link2 size={14} /></span>
              <div>
                <strong>Docs Vinculados</strong>
                <span>{docCount > 0 ? `${docCount} documento${docCount !== 1 ? 's' : ''} anexado${docCount !== 1 ? 's' : ''}` : 'Nenhum documento anexado'}</span>
              </div>
            </div>

            <p className="section-label" style={{ margin: '16px 0 10px', color: 'rgba(255,255,255,0.5)' }}>SMART ALERT</p>
            {secoesFaltando.length > 0 ? (
              <div className="intel-card intel-card-danger">
                <span className="intel-card-label" style={{ color: '#ff8f7a' }}>ALERTA DE RISCO</span>
                <p>{secoesFaltando.join(', ')} não {secoesFaltando.length > 1 ? 'foram identificadas' : 'foi identificada'} no texto gerado.</p>
                <button className="intel-card-link" type="button" onClick={() => navigate(`/cases/${id}/pecas`)}>Resolver agora →</button>
              </div>
            ) : (
              <div className="intel-card">
                <span className="intel-card-label">TUDO CERTO</span>
                <p>Nenhum alerta encontrado na estrutura da peça.</p>
              </div>
            )}

            <p className="section-label" style={{ margin: '16px 0 10px', color: 'rgba(255,255,255,0.5)' }}>DICA DE REDAÇÃO</p>
            <div className="intel-card">
              <p>"Confira se a jurisprudência citada está vigente e se os valores batem com os anexos."</p>
            </div>

            {nextStage && (
              <button
                className="intel-suggestion review-finalize-btn"
                type="button"
                onClick={() => canAdvance && avancarEtapa.mutate(nextStage.key)}
                disabled={!canAdvance || avancarEtapa.isPending}
              >
                <Rocket size={15} />
                <span>{canAdvance ? `Avançar para ${nextStage.label}` : currentReq.hint}</span>
              </button>
            )}
          </div>

        </div>
       ) : mostrarArquivamento ? (
        <div className="closing-layout-v2">
          <div className="closing-hero-v2">
            <span className="closing-hero-icon"><Archive size={26} /></span>
            <h2>Caso Arquivado</h2>
            <p>
              {arquivadoManualmente
                ? 'Este caso foi arquivado manualmente pelo advogado responsável.'
                : 'Este caso foi arquivado automaticamente: todos os prazos cadastrados já expiraram.'}
            </p>
          </div>

          <div className="closing-summary-grid">
            <div className="closing-summary-card"><span>CASO</span><strong>{legalCase.title || legalCase.clientName}</strong></div>
            <div className="closing-summary-card"><span>PROTOCOLO</span><strong>#{legalCase.protocolo}</strong></div>
            <div className="closing-summary-card"><span>DOCUMENTOS</span><strong>{docCount}</strong></div>
            <div className="closing-summary-card"><span>PEÇAS</span><strong>{pecas.length}</strong></div>
          </div>

          <div className="closing-actions-row">
            <Button variant="secondary" onClick={() => reabrir.mutate()} disabled={reabrir.isPending}>
              {reabrir.isPending ? 'Reabrindo...' : 'Reabrir caso'}
            </Button>
            <Button onClick={() => navigate('/cases')}>Voltar para Casos <Play size={13} fill="currentColor" /></Button>
          </div>
        </div>
       ) : currentStage.key === 'encerramento' ? (
        <div className="closing-layout-v2">
          <p className="section-label" style={{ marginBottom: 12 }}>RESUMO DA OPERAÇÃO</p>
          <div className="closing-summary-grid">
            <div className="closing-summary-card"><span>CASO</span><strong>{legalCase.title || legalCase.clientName}</strong></div>
            <div className="closing-summary-card"><span>TIPO</span><strong>{pecas[0]?.categoria ?? legalCase.tipoServico ?? '—'}</strong></div>
            <div className="closing-summary-card"><span>TEMPO TOTAL</span><strong>{tempoTotalDias} dia{tempoTotalDias !== 1 ? 's' : ''}</strong></div>
            <div className="closing-summary-card"><span>RESPONSÁVEL</span><strong>{user?.name?.split(' ')[0] ?? '—'}</strong></div>
          </div>

          <p className="section-label" style={{ margin: '24px 0 12px' }}>RESULTADO DA EXECUÇÃO</p>
          <div className="closing-result-grid">
            <div className="closing-result-card">
              <span className="closing-result-icon"><FileText size={16} /></span>
              <span>Peça jurídica criada</span>
              <span className={`closing-result-check ${hasPeca ? 'ok' : ''}`}>{hasPeca ? <CheckCircle2 size={16} /> : <Circle size={16} />}</span>
            </div>
            <div className="closing-result-card">
              <span className="closing-result-icon"><FileText size={16} /></span>
              <span>Documentos organizados</span>
              <span className={`closing-result-check ${docCount > 0 ? 'ok' : ''}`}>{docCount > 0 ? <CheckCircle2 size={16} /> : <Circle size={16} />}</span>
            </div>
            <div className="closing-result-card">
              <span className="closing-result-icon"><ShieldCheck size={16} /></span>
              <span>Revisão concluída</span>
              <span className="closing-result-check ok"><CheckCircle2 size={16} /></span>
            </div>
            <div className="closing-result-card">
              <span className="closing-result-icon"><Sparkles size={16} /></span>
              <span>Histórico salvo</span>
              <span className="closing-result-check ok"><CheckCircle2 size={16} /></span>
            </div>
          </div>

          <p className="section-label" style={{ margin: '24px 0 12px' }}>REGISTRO DA EXECUÇÃO</p>
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
            {docCount > 0 && (
              <div className="closing-record-row">
                <span className="closing-record-name"><FileText size={14} /> Documentos anexados <span className="muted">{docCount} arquivo{docCount !== 1 ? 's' : ''}</span></span>
                <span className="muted">{formatDate(legalCase.updatedAt)}</span>
                <span className="closing-record-actions">
                  <button onClick={() => navigate(`/cases/${id}/documentos`)}>Visualizar</button>
                </span>
              </div>
            )}
          </div>

          <div className="closing-actions-row">
            <Button variant="secondary" onClick={() => arquivar.mutate()} disabled={arquivar.isPending}>
              <Archive size={14} /> {arquivar.isPending ? 'Arquivando...' : 'Arquivar caso'}
            </Button>
            <Button onClick={() => navigate('/cases')}>Voltar para Casos <Play size={13} fill="currentColor" /></Button>
          </div>
        </div>
       ) : (
        <div className="case-workspace-grid">
        {/* ── Coluna esquerda: resumo do caso + próxima ação ── */}
        <div className="case-col case-col-left">
          <div className="panel case-summary-card">
            <div className="case-summary-row">
              <div><span>CLIENTE</span><strong>{legalCase.clientName}</strong></div>
              <div><span>PROCESSO</span><strong>{legalCase.caseNumber ?? '—'}</strong></div>
              <div><span>STATUS</span><span className="badge badge-normal">{caseStatusLabel(legalCase.status)}</span></div>
            </div>
            <div className="case-summary-row">
              <div><span>ÁREA</span><strong>{areaLabel(legalCase.area)}</strong></div>
              <div>
                <span>RESPONSÁVEL</span>
                <span className="case-responsavel">
                  <span className="case-avatar-mini">{initialsOf(user?.name)}</span>
                  {user?.name?.split(' ')[0] ?? '—'}
                </span>
              </div>
              <div><span>VALOR CAUSA</span><strong className="text-primary">{compactCurrency(legalCase.claimValue)}</strong></div>
            </div>
            <div className="case-summary-row">
              <div><span>HONORÁRIOS</span><strong>{compactCurrency(legalCase.fees)}</strong></div>
              <div><span>RECEBIDO</span><strong style={{ color: 'var(--success)' }}>{compactCurrency(legalCase.received)}</strong></div>
              <div><span>SALDO</span><strong style={{ color: legalCase.pending > 0 ? 'var(--warning)' : 'var(--muted)' }}>{compactCurrency(legalCase.pending)}</strong></div>
            </div>
            {legalCase.status !== 'arquivado' && (
              <button className="case-archive-link" onClick={() => arquivar.mutate()} disabled={arquivar.isPending}>
                <Archive size={12} /> {arquivar.isPending ? 'Arquivando...' : 'Arquivar caso'}
              </button>
            )}
          </div>

          <div className="panel case-next-action-card">
            <div className="case-next-action-head">
              <span className="case-next-action-icon"><PenLine size={16} /></span>
              <strong>{PROXIMA_ACAO[currentStage.key]}</strong>
              {proximoDeadline?.priority === 'critical' && <span className="case-priority-badge">PRIORIDADE ALTA</span>}
            </div>
            <div className="case-next-action-grid">
              <div><span>MOTIVO</span><strong>{proximoDeadline ? (isHoje(proximoDeadline.dueDate) ? 'Prazo fatal' : 'Prazo próximo') : (currentReq.hint || 'Etapa pendente')}</strong></div>
              <div><span>RESPONSÁVEL</span><strong>{user?.name?.split(' ')[0] ?? '—'}</strong></div>
              <div><span>IMPACTO</span><strong>{currentReq.hint || 'Avanço do fluxo de execução'}</strong></div>
              <div><span>PRAZO</span><strong>{proximoDeadline ? (isHoje(proximoDeadline.dueDate) ? 'Hoje' : formatDate(proximoDeadline.dueDate)) : 'Sem prazo definido'}</strong></div>
            </div>
            <button
              className="case-execute-btn"
              onClick={() => {
                if (currentStage.key === 'documentos') setMostrarSeletorTipo(true)
                else if (currentStage.key === 'pecas') {
                  if (podeGerarPecas) navigate(`/cases/${id}/pecas`)
                  else toast(bloqueioPecasHint, 'warning')
                }
                else if (currentStage.key === 'prazos') setAddingPrazo(true)
              }}
            >
              <Zap size={14} fill="currentColor" /> Executar Agora
            </button>
          </div>
        </div>

        {/* ── Coluna central: prévia da peça + documentos ── */}
        <div className="case-col case-col-main">
          <div className="panel case-doc-preview">
            {pecas[0] ? (
              <>
                <div className="case-doc-preview-head">
                  <strong>{pecas[0].categoria.replace(/\s+/g, '_')}_V{pecas[0].versao}</strong>
                  <div className="case-doc-preview-tags">
                    <span className="case-doc-tag">{pecas[0].categoria}</span>
                    <span className="case-doc-tag">Versão {pecas[0].versao}</span>
                    <span className="case-doc-tag ok"><span className="live-dot-mini" /> Salvo</span>
                  </div>
                </div>
                <div className="case-doc-preview-body" dangerouslySetInnerHTML={{ __html: pecas[0].conteudo }} />
                <div className="case-doc-preview-actions">
                  <Button variant="secondary" onClick={() => navigate(`/cases/${id}/pecas`)}>Abrir Editor</Button>
                  <Button variant="secondary" onClick={() => navigate(`/cases/${id}/pecas`)}>Nova Versão</Button>
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
                  <Button onClick={() => navigate(`/cases/${id}/pecas`)}><Sparkles size={14} /> Gerar peça com IA</Button>
                )}
              </div>
            )}
          </div>

          <div className="panel">
            <div className="ws-section-header">
              <p className="section-label">DOCUMENTOS</p>
              <button className="section-link-btn" onClick={() => setMostrarSeletorTipo((v) => !v)}>
                <Upload size={13} /> Novo Upload
              </button>
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

        {/* ── Coluna direita: prazos, sugestões IA, atividade ── */}
        <div className="case-col case-col-right">
          <div className="panel">
            <div className="ws-section-header">
              <p className="section-label" style={{ margin: 0 }}>PRAZOS</p>
              <button className="section-link-btn" onClick={() => setAddingPrazo((v) => !v)}>
                <Plus size={13} /> Novo
              </button>
            </div>

            {addingPrazo && (
              <div className="case-prazo-form">
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

            {prazosHoje.length > 0 && (
              <>
                <p className="case-prazo-group-label danger">HOJE</p>
                {prazosHoje.map((d) => (
                  <div key={d.id} className="case-prazo-item danger">
                    <strong>{d.title}</strong>
                    <span>{horaPrazo(d.dueDate)} (Fatal)</span>
                  </div>
                ))}
              </>
            )}
            {prazosProximos.length > 0 && (
              <>
                <p className="case-prazo-group-label">PRÓXIMOS 7 DIAS</p>
                {prazosProximos.map((d) => (
                  <div key={d.id} className="case-prazo-item">
                    <strong>{d.title}</strong>
                    <span>{formatDate(d.dueDate)}</span>
                  </div>
                ))}
              </>
            )}
            {prazosHoje.length === 0 && prazosProximos.length === 0 && !addingPrazo && (
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>Nenhum prazo nos próximos 7 dias.</p>
            )}
          </div>

          <div className="case-ia-suggestions">
            <div className="case-ia-suggestions-head"><Lightbulb size={15} /><strong>Sugestões IA</strong></div>
            {sugestoes.map((s, i) => (
              <div key={i} className="case-ia-suggestion-item">
                <p>{s.texto}</p>
                {s.acaoLabel && <button onClick={s.onClick}>{s.acaoLabel} →</button>}
              </div>
            ))}
          </div>

          <div className="panel">
            <p className="section-label" style={{ marginBottom: 14 }}>ATIVIDADE RECENTE</p>
            {atividade.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>Nenhuma atividade registrada ainda.</p>
            ) : (
              <ul className="case-activity-list">
                {atividade.map((a, i) => (
                  <li key={i}>
                    <span className="case-activity-dot" />
                    <div>
                      <strong>{a.texto}</strong>
                      <span>{relativeTime(a.quando)} · {user?.name?.split(' ')[0] ?? 'Você'}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        </div>
       )}
      </div>
    </div>
  )
}
