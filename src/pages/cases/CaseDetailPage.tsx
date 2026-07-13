import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle, Archive, CheckCircle2, Circle,
  Download, FileText, Link2, Lock, Pencil, Play, Plus, Rocket, ShieldCheck, Sparkles, Star,
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
        </div>
      </div>

      {/* ── Pipeline (stepper numerado) ── */}
      <div className="workspace-pipeline">
        <div className="case-stage-head">
          <h2>{currentStage.label} <span className="case-stage-badge">STAGE {currentPipelineIdx + 1}</span></h2>
          {STAGE_SUBTITLE[currentStage.key] && <p>{STAGE_SUBTITLE[currentStage.key]}</p>}
        </div>
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
                    {canAdvance && nextStage && (
                      <Button onClick={() => avancarEtapa.mutate(nextStage.key)} disabled={avancarEtapa.isPending}>
                        <Play size={13} fill="currentColor" /> Avançar para {nextStage.label}
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
