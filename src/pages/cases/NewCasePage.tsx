import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Star } from 'lucide-react'
import { createCaseSchema, type CreateCaseInput } from '@/lib/zod-schemas'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { PIPELINE } from '@/lib/pipeline'
import { casesService, type ClienteBusca } from '@/services/cases.service'
import { clientesService } from '@/services/clientes.service'
import { toast } from '@/store/toastStore'

const AREAS = [
  { value: 'civil', label: 'Cível' },
  { value: 'trabalhista', label: 'Trabalhista' },
  { value: 'familia', label: 'Família' },
  { value: 'criminal', label: 'Criminal' },
  { value: 'empresarial', label: 'Empresarial' },
  { value: 'tributario', label: 'Tributário' },
  { value: 'consumidor', label: 'Consumidor' },
  { value: 'penal', label: 'Penal' },
] as const

const PRIORIDADES = [
  { value: 'alta', label: 'Prioridade Alta' },
  { value: 'media', label: 'Prioridade Média' },
  { value: 'baixa', label: 'Prioridade Baixa' },
] as const

const DRAFT_STORAGE_PREFIX = 'orbian:new-case-draft:'

type DraftPersistido = {
  values: Partial<CreateCaseInput>
  favorito?: boolean
  caseId?: string | null
  protocolo?: number | null
}

export function NewCasePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const clienteFixo = Boolean(searchParams.get('clienteId'))
  const [error, setError] = useState('')
  const [caseId, setCaseId] = useState<string | null>(null)
  const [protocolo, setProtocolo] = useState<number | null>(null)
  const [savingDraft, setSavingDraft] = useState(false)
  const [favorito, setFavorito] = useState(false)
  const [clienteQuery, setClienteQuery] = useState('')
  const [clienteSugestoes, setClienteSugestoes] = useState<ClienteBusca[]>([])
  const [mostrarPreliminar, setMostrarPreliminar] = useState(false)

  const {
    formState: { errors, isSubmitting },
    getValues,
    handleSubmit,
    register,
    setValue,
    watch,
  } = useForm<CreateCaseInput>({
    resolver: zodResolver(createCaseSchema),
    defaultValues: {
      area: 'civil',
      prioridade: 'media',
      honorariosTipo: 'percentual',
      clienteId: searchParams.get('clienteId') || undefined,
      clientName: searchParams.get('clienteNome') || '',
    },
  })

  useEffect(() => {
    if (!clienteQuery || getValues('clienteId')) { setClienteSugestoes([]); return }
    const t = setTimeout(() => {
      casesService.searchClientes(clienteQuery).then(setClienteSugestoes).catch(() => setClienteSugestoes([]))
    }, 300)
    return () => clearTimeout(t)
  }, [clienteQuery, getValues])

  // Ao abrir "Novo Caso" a partir de um cliente existente, pré-preenche os campos que
  // costumam se repetir entre os casos do mesmo cliente (tribunal/vara/UF/área), usando
  // o caso mais recente dele como referência — o advogado ainda pode ajustar tudo.
  const clienteIdParam = searchParams.get('clienteId')
  const { data: casosDoCliente } = useQuery({
    queryKey: ['cases', { clienteId: clienteIdParam }],
    queryFn: () => casesService.list({ clienteId: clienteIdParam! }),
    enabled: !!clienteIdParam,
  })

  // Rascunho persistido no navegador: sobrevive a F5 e queda de conexão porque não
  // depende do backend. Escopado por cliente pra não misturar rascunhos de casos diferentes.
  const draftKey = `${DRAFT_STORAGE_PREFIX}${clienteIdParam ?? 'anon'}`
  const prefillAplicado = useRef(false)

  const draftRestaurado = useRef(false)
  useEffect(() => {
    if (draftRestaurado.current) return
    draftRestaurado.current = true
    const raw = localStorage.getItem(draftKey)
    if (!raw) return
    try {
      const draft = JSON.parse(raw) as DraftPersistido
      Object.entries(draft.values).forEach(([key, value]) => {
        if (value !== undefined && value !== null) setValue(key as keyof CreateCaseInput, value as never)
      })
      if (draft.favorito) setFavorito(draft.favorito)
      if (draft.caseId) { setCaseId(draft.caseId); setProtocolo(draft.protocolo ?? null) }
      // Já tem dados reais recuperados — não deixa o auto-preenchimento do cliente sobrescrever.
      prefillAplicado.current = true
      toast('Rascunho recuperado — continue de onde parou.', 'info')
    } catch {
      localStorage.removeItem(draftKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey])

  // Auto-save: grava no localStorage a cada digitação (instantâneo, funciona offline)
  // e tenta sincronizar com o servidor em segundo plano, sem travar a digitação nem
  // mostrar erro se a internet cair — a próxima digitação tenta de novo.
  useEffect(() => {
    let localTimer: ReturnType<typeof setTimeout> | null = null
    let backendTimer: ReturnType<typeof setTimeout> | null = null

    const subscription = watch((values) => {
      if (localTimer) clearTimeout(localTimer)
      localTimer = setTimeout(() => {
        const draft: DraftPersistido = { values, favorito, caseId, protocolo }
        localStorage.setItem(draftKey, JSON.stringify(draft))
      }, 500)

      if (backendTimer) clearTimeout(backendTimer)
      if (values.clientName?.trim()) {
        backendTimer = setTimeout(() => { onSaveDraft(true) }, 2500)
      }
    })

    return () => {
      subscription.unsubscribe()
      if (localTimer) clearTimeout(localTimer)
      if (backendTimer) clearTimeout(backendTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch, draftKey, favorito, caseId, protocolo])

  // Dados completos do cliente (CPF/CNPJ, telefone, e-mail) — exibidos como confirmação
  // de que nada precisa ser redigitado, já que o caso já nasce vinculado a este cliente.
  const { data: cliente } = useQuery({
    queryKey: ['cliente', clienteIdParam],
    queryFn: () => clientesService.get(clienteIdParam!),
    enabled: !!clienteIdParam,
  })

  useEffect(() => {
    const ultimoCaso = casosDoCliente?.[0]
    if (!ultimoCaso || prefillAplicado.current) return
    prefillAplicado.current = true
    if (ultimoCaso.tribunal) setValue('tribunal', ultimoCaso.tribunal)
    if (ultimoCaso.vara) setValue('vara', ultimoCaso.vara)
    if (ultimoCaso.uf) setValue('uf', ultimoCaso.uf)
    setValue('area', ultimoCaso.area)
    setValue('honorariosTipo', ultimoCaso.feesType)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [casosDoCliente])

  const honorariosTipo = watch('honorariosTipo')
  const valorCausa = watch('valorCausa')
  const honorarios = watch('honorarios')
  const honorariosCalculado = honorariosTipo === 'percentual' && valorCausa && honorarios
    ? (valorCausa * honorarios) / 100
    : null

  async function onSaveDraft(silencioso = false) {
    setError('')
    setSavingDraft(true)
    try {
      const input = getValues()
      if (caseId) {
        await casesService.update(caseId, { rascunho: true, favorito, ...toPatch(input) })
      } else {
        const caso = await casesService.create(input, { rascunho: true, favorito })
        setCaseId(caso.id)
        setProtocolo(caso.protocolo)
      }
      if (!silencioso) toast('Rascunho salvo.', 'success')
    } catch {
      if (!silencioso) toast('Não foi possível salvar o rascunho.', 'error')
    } finally {
      setSavingDraft(false)
    }
  }

  async function onVoltar() {
    if (getValues('clientName')) await onSaveDraft(true)
    const clienteId = searchParams.get('clienteId')
    navigate(clienteId ? `/clientes/${clienteId}` : '/clientes')
  }

  async function onSubmit(input: CreateCaseInput) {
    setError('')
    try {
      if (caseId) {
        await casesService.update(caseId, { rascunho: false, favorito, ...toPatch(input) })
        localStorage.removeItem(draftKey)
        navigate(`/cases/${caseId}/documentos`)
        return
      }

      const caso = await casesService.create(input, { rascunho: false, favorito })
      localStorage.removeItem(draftKey)
      navigate(`/cases/${caso.id}/documentos`)
    } catch {
      setError('Erro ao criar caso. Verifique os dados e tente novamente.')
    }
  }

  return (
    <form className="new-case-page" onSubmit={handleSubmit(onSubmit)}>
      <header className="new-case-header">
        <div>
          <h1>Cadastro</h1>
          <p className="nc-header-meta">
            {protocolo ? <span>Protocolo #{protocolo}</span> : <span className="muted">Novo cadastro</span>}
            <span className="nc-header-sep">|</span>
            <select className="nc-priority-select" {...register('prioridade')} defaultValue="media">
              {PRIORIDADES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <span className="nc-header-sep">|</span>
            <label className="nc-favorito-toggle">
              <input type="checkbox" checked={favorito} onChange={(e) => setFavorito(e.target.checked)} />
              <Star size={13} fill={favorito ? 'currentColor' : 'none'} />
              Marcar como favorito
            </label>
          </p>
        </div>

        <nav className="pipeline-tabs">
          {PIPELINE.map(({ key, label }, i) => (
            <span key={key} className={`pipeline-tab ${i === 0 ? 'active' : 'locked'}`}>
              {label}
            </span>
          ))}
        </nav>

        <button type="submit" className="new-case-cta" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Continuar para Documentos'}
        </button>
      </header>

      <div className="new-case-body">
        <div className="new-case-row2">
          <section className="new-case-card">
            <p className="section-label-lg">Informações do Caso</p>
            <p className="new-case-card-sub">Dados essenciais para identificação da nova operação jurídica.</p>

            <div className="nc-field-pair">
              <label className="nc-field nc-cliente-field">
                Cliente *
                {clienteFixo ? (
                  <>
                    <input {...register('clientName')} readOnly disabled />
                    {(cliente?.cpfCnpj || cliente?.telefone || cliente?.email) && (
                      <div className="nc-cliente-locked-meta">
                        {cliente.cpfCnpj && <span>{cliente.cpfCnpj}</span>}
                        {cliente.telefone && <span>{cliente.telefone}</span>}
                        {cliente.email && <span>{cliente.email}</span>}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <input
                      {...register('clientName')}
                      placeholder="Nome ou CPF/CNPJ"
                      autoComplete="off"
                      onChange={(e) => {
                        setValue('clientName', e.target.value)
                        setValue('clienteId', undefined)
                        setClienteQuery(e.target.value)
                      }}
                    />
                    {errors.clientName && <small>{errors.clientName.message}</small>}
                    {clienteSugestoes.length > 0 && (
                      <ul className="nc-cliente-suggestions">
                        {clienteSugestoes.map((c) => (
                          <li
                            key={c.id}
                            onClick={() => {
                              setValue('clientName', c.nome)
                              setValue('clienteId', c.id)
                              setClienteSugestoes([])
                            }}
                          >
                            {c.nome}{c.cpfCnpj ? ` · ${c.cpfCnpj}` : ''}
                          </li>
                        ))}
                      </ul>
                    )}
                    {watch('clienteId') && <small className="nc-cliente-hint">Cliente existente selecionado — este será um novo processo para ele.</small>}
                  </>
                )}
              </label>
              <label className="nc-field">
                Parte Contrária
                <input {...register('reuNome')} placeholder="Nome ou CPF/CNPJ" />
              </label>
            </div>

            <div className="nc-field-pair">
              <label className="nc-field">
                Número do Processo
                <input {...register('caseNumber')} placeholder="0000000-00.0000.0.00.0000" />
                {errors.caseNumber && <small>{errors.caseNumber.message}</small>}
              </label>
              <label className="nc-field">
                Área Jurídica *
                <select {...register('area')}>
                  {AREAS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </label>
            </div>

            <div className="nc-field-pair">
              <label className="nc-field">
                Tipo da Ação
                <input {...register('flow')} placeholder="Ex: Indenizatória" />
              </label>
              <label className="nc-field">
                Status Inicial
                <select {...register('statusInicial')} defaultValue="Novo">
                  <option value="Novo">Novo</option>
                  <option value="Em andamento">Em andamento</option>
                  <option value="Aguardando documentos">Aguardando documentos</option>
                </select>
              </label>
            </div>

            <div className="nc-field-trio">
              <label className="nc-field">
                Tribunal
                <input {...register('tribunal')} placeholder="TJSP" />
              </label>
              <label className="nc-field">
                Vara
                <input {...register('vara')} placeholder="2ª Vara" />
              </label>
              <label className="nc-field">
                UF
                <select {...register('uf')} defaultValue="SP">
                  {['SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'DF', 'GO', 'PE', 'CE'].map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="new-case-card">
            <p className="section-label-lg">Financeiro</p>
            <p className="new-case-card-sub">Informações financeiras vinculadas ao caso.</p>

            <div className="nc-field-pair">
              <label className="nc-field">
                Valor da Causa
                <CurrencyInput value={valorCausa} onChange={(v) => setValue('valorCausa', v)} />
              </label>
              <label className="nc-field">
                Honorários {honorariosTipo === 'percentual' ? '(%)' : '(R$)'}
                {honorariosTipo === 'percentual' ? (
                  <input type="number" step="0.01" min="0" {...register('honorarios', { setValueAs: (v) => v === '' ? undefined : Number(v) })} placeholder="% do valor da causa" />
                ) : (
                  <CurrencyInput value={honorarios} onChange={(v) => setValue('honorarios', v)} />
                )}
              </label>
            </div>
            <div className="nc-field-pair">
              <label className="nc-field">
                Tipo de honorários
                <select {...register('honorariosTipo')} defaultValue="percentual">
                  <option value="fixo">Fixo (R$)</option>
                  <option value="percentual">Percentual (% do valor da causa)</option>
                </select>
              </label>
              {honorariosCalculado !== null && (
                <p className="nc-honorarios-preview">
                  Valor estimado: <strong>R$ {honorariosCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                </p>
              )}
            </div>

            <div className="nc-especiais-row">
              <label className="nc-checkbox-inline">
                <input type="checkbox" {...register('pedidoGratuidadeJustica')} /> Gratuidade de Justiça
              </label>
              <label className="nc-checkbox-inline">
                <input type="checkbox" {...register('pedidoTutelaUrgencia')} /> Tutela de Urgência
              </label>
              {!mostrarPreliminar && (
                <button type="button" className="nc-add-preliminar-btn" onClick={() => setMostrarPreliminar(true)}>
                  + Adicionar preliminar
                </button>
              )}
            </div>
            {mostrarPreliminar && (
              <label className="nc-field">
                Preliminar
                <textarea rows={3} {...register('textoPreliminar')} placeholder="Descreva a preliminar a ser arguida antes do mérito..." />
              </label>
            )}
          </section>
        </div>

        {error && <p className="new-case-error">{error}</p>}

        <div className="new-case-cta-row">
          <button type="button" className="nc-draft-link" onClick={onVoltar}>
            <ArrowLeft size={14} /> Voltar
          </button>
          <button type="button" className="nc-draft-link" onClick={() => onSaveDraft()} disabled={savingDraft}>
            {savingDraft ? 'Salvando rascunho...' : 'Salvar Rascunho'}
          </button>
          <button type="submit" className="new-case-cta" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Continuar para Documentos'}
          </button>
        </div>
      </div>
    </form>
  )
}

function toPatch(input: CreateCaseInput) {
  return {
    numeroProcesso: input.caseNumber || null,
    tribunal: input.tribunal || null,
    instancia: input.instancia || null,
    vara: input.vara || null,
    uf: input.uf || null,
    areaJuridica: input.area,
    categoria: input.flow || null,
    tipoServico: input.tipoServico || null,
    prioridade: input.prioridade || null,
    statusInicial: input.statusInicial || null,
    reuNome: input.reuNome || null,
    reuCpfCnpj: input.reuCpfCnpj || null,
    reuAdvogado: input.reuAdvogado || null,
    resumoFatos: input.resumoFatos || null,
    pedidosProvidencias: input.pedidosProvidencias || null,
    valorCausa: input.valorCausa,
    honorarios: input.honorarios,
    honorariosTipo: input.honorariosTipo,
    pedidoGratuidadeJustica: input.pedidoGratuidadeJustica ?? false,
    pedidoTutelaUrgencia: input.pedidoTutelaUrgencia ?? false,
    textoPreliminar: input.textoPreliminar || null,
  }
}
