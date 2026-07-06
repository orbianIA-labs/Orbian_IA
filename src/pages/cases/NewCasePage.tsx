import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { createCaseSchema, type CreateCaseInput } from '@/lib/zod-schemas'
import { casesService } from '@/services/cases.service'
import { useState } from 'react'
import { Circle } from 'lucide-react'

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

const TIPOS_SERVICO = [
  'Processo Judicial',
  'Consultoria',
  'Contrato',
  'Parecer',
  'Administrativo',
] as const

const WORKFLOW_STEPS = [
  { key: 'cadastro',     label: 'Cadastro',     desc: 'Dados do cliente e processo' },
  { key: 'documentos',   label: 'Documentos',   desc: 'Coleta e organização de docs' },
  { key: 'pecas',        label: 'Peças',        desc: 'Elaboração de petições com IA' },
  { key: 'revisao',      label: 'Revisão',      desc: 'Revisão e ajustes finais' },
  { key: 'protocolo',    label: 'Protocolo',    desc: 'Protocolo no tribunal' },
  { key: 'atualizacoes', label: 'Atualizações', desc: 'Acompanhamento processual' },
  { key: 'encerramento', label: 'Encerrado',    desc: 'Conclusão do caso' },
]

// Input numérico vazio → undefined; senão, número.
const toMoney = (v: unknown) =>
  v === '' || v === null || v === undefined ? undefined : Number(v)

export function NewCasePage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    watch,
  } = useForm<CreateCaseInput>({
    resolver: zodResolver(createCaseSchema),
    defaultValues: { area: 'civil' },
  })

  const selectedArea = watch('area')
  const selectedTipo = watch('tipoServico')
  const clientName = watch('clientName')
  const title = watch('title')

  async function onSubmit(input: CreateCaseInput) {
    setError('')
    try {
      const caso = await casesService.create(input)
      navigate(`/cases/${caso.id}`)
    } catch {
      setError('Erro ao criar caso. Verifique os dados e tente novamente.')
    }
  }

  return (
    <div className="new-case-layout">
      {/* ── Formulário ── */}
      <div className="new-case-form-col">
        <section className="page-heading compact">
          <div>
            <p className="eyebrow">Novo caso</p>
            <h1>Cadastrar caso</h1>
          </div>
        </section>

        <form className="form-panel form-grid" onSubmit={handleSubmit(onSubmit)}>

          <div className="form-section-title span-2">
            <span className="form-step-badge">1</span>
            Cliente
          </div>
          <label>
            Nome completo
            <input {...register('clientName')} placeholder="Nome do cliente" />
            {errors.clientName && <small>{errors.clientName.message}</small>}
          </label>
          <label>
            CPF / CNPJ
            <input {...register('clientCpf')} placeholder="000.000.000-00" />
          </label>
          <label>
            Telefone
            <input {...register('clientPhone')} placeholder="(00) 00000-0000" />
          </label>
          <label>
            Email
            <input {...register('clientEmail')} placeholder="cliente@email.com" />
            {errors.clientEmail && <small>{errors.clientEmail.message}</small>}
          </label>

          <div className="form-section-title span-2">
            <span className="form-step-badge">2</span>
            Área do Direito
          </div>
          <div className="radio-grid span-2">
            {AREAS.map((a) => (
              <label key={a.value} className={`radio-card ${selectedArea === a.value ? 'selected' : ''}`}>
                <input type="radio" value={a.value} {...register('area')} style={{ display: 'none' }} />
                {a.label}
              </label>
            ))}
          </div>

          <div className="form-section-title span-2">
            <span className="form-step-badge">3</span>
            Tipo de Serviço
          </div>
          <div className="radio-grid span-2">
            {TIPOS_SERVICO.map((t) => (
              <label key={t} className={`radio-card ${selectedTipo === t ? 'selected' : ''}`}>
                <input type="radio" value={t} {...register('tipoServico')} style={{ display: 'none' }} />
                {t}
              </label>
            ))}
          </div>

          <div className="form-section-title span-2">
            <span className="form-step-badge">4</span>
            Processo (opcional)
          </div>
          <label className="span-2">
            Título interno
            <input {...register('title')} placeholder="Ex.: BPC/LOAS - Maria Silva" />
            {errors.title && <small>{errors.title.message}</small>}
          </label>
          <label>
            Nº Processo (CNJ)
            <input {...register('caseNumber')} placeholder="0000000-00.0000.0.00.0000" />
            {errors.caseNumber && <small>{errors.caseNumber.message}</small>}
          </label>
          <label>
            Vara / Comarca
            <input {...register('tribunal')} placeholder="Ex.: TJSP, TRF3" />
          </label>

          <div className="form-section-title span-2">
            <span className="form-step-badge">5</span>
            Financeiro (opcional)
          </div>
          <label>
            Valor da causa (R$)
            <input type="number" step="0.01" min="0" {...register('valorCausa', { setValueAs: toMoney })} placeholder="0,00" />
            {errors.valorCausa && <small>{errors.valorCausa.message}</small>}
          </label>
          <label>
            Honorários (R$)
            <input type="number" step="0.01" min="0" {...register('honorarios', { setValueAs: toMoney })} placeholder="0,00" />
            {errors.honorarios && <small>{errors.honorarios.message}</small>}
          </label>
          <label>
            Já recebido (R$)
            <input type="number" step="0.01" min="0" {...register('valorRecebido', { setValueAs: toMoney })} placeholder="0,00" />
            {errors.valorRecebido && <small>{errors.valorRecebido.message}</small>}
          </label>

          {error && <p className="span-2" style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}

          <div className="span-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Criar caso'}
            </Button>
          </div>
        </form>
      </div>

      {/* ── Aside: workflow preview ── */}
      <aside className="new-case-aside">
        <div className="panel workflow-panel">
          <p className="section-label">FLUXO DE TRABALHO</p>
          {(clientName || title) && (
            <div className="workflow-summary">
              <strong>{title || clientName}</strong>
              <span>
                Área: {AREAS.find((a) => a.value === selectedArea)?.label ?? '—'}
                {selectedTipo ? ` · ${selectedTipo}` : ''}
              </span>
            </div>
          )}
          <div className="workflow-preview">
            {WORKFLOW_STEPS.map((step, i) => (
              <div key={step.key} className={`workflow-step ${i === 0 ? 'active' : ''}`}>
                <div className="workflow-marker">
                  <span className="workflow-dot" />
                  {i < WORKFLOW_STEPS.length - 1 && <span className="workflow-line" />}
                </div>
                <div className="workflow-step-content">
                  <strong>{step.label}</strong>
                  <span>{step.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel suggested-docs">
          <p className="section-label">DOCUMENTOS SUGERIDOS</p>
          <ul>
            {['Procuração', 'Documentos pessoais', 'Contrato / Nota fiscal', 'Comprovantes de dano'].map((doc) => (
              <li key={doc}>
                <Circle size={11} />
                {doc}
              </li>
            ))}
          </ul>
          <p className="suggested-note">Você poderá adicionar documentos após criar o caso.</p>
        </div>
      </aside>
    </div>
  )
}
