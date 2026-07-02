import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { createCaseSchema, type CreateCaseInput } from '@/lib/zod-schemas'
import { casesService } from '@/services/cases.service'
import { useState } from 'react'

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
    <div className="page-stack narrow">
      <section className="page-heading compact">
        <div>
          <p className="eyebrow">Novo caso</p>
          <h1>Cadastrar caso</h1>
        </div>
      </section>

      <form className="form-panel" onSubmit={handleSubmit(onSubmit)}>

        {/* ETAPA 1 — Cliente */}
        <div className="form-section-title">
          <span className="form-step-badge">1</span>
          Cliente
        </div>
        <label>
          Nome completo
          <input {...register('clientName')} placeholder="Nome do cliente" />
          {errors.clientName && <small>{errors.clientName.message}</small>}
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label>
            CPF / CNPJ
            <input {...register('clientCpf')} placeholder="000.000.000-00" />
          </label>
          <label>
            Telefone
            <input {...register('clientPhone')} placeholder="(00) 00000-0000" />
          </label>
        </div>
        <label>
          Email
          <input {...register('clientEmail')} placeholder="cliente@email.com" />
          {errors.clientEmail && <small>{errors.clientEmail.message}</small>}
        </label>

        {/* ETAPA 2 — Área do Direito */}
        <div className="form-section-title" style={{ marginTop: 8 }}>
          <span className="form-step-badge">2</span>
          Área do Direito
        </div>
        <div className="radio-grid">
          {AREAS.map((a) => (
            <label key={a.value} className={`radio-card ${selectedArea === a.value ? 'selected' : ''}`}>
              <input
                type="radio"
                value={a.value}
                {...register('area')}
                style={{ display: 'none' }}
              />
              {a.label}
            </label>
          ))}
        </div>

        {/* ETAPA 2b — Tipo de Serviço */}
        <div className="form-section-title" style={{ marginTop: 8 }}>
          <span className="form-step-badge">3</span>
          Tipo de Serviço
        </div>
        <div className="radio-grid">
          {TIPOS_SERVICO.map((t) => (
            <label key={t} className={`radio-card ${selectedTipo === t ? 'selected' : ''}`}>
              <input
                type="radio"
                value={t}
                {...register('tipoServico')}
                style={{ display: 'none' }}
              />
              {t}
            </label>
          ))}
        </div>

        {/* ETAPA 3 — Processo */}
        <div className="form-section-title" style={{ marginTop: 8 }}>
          <span className="form-step-badge">4</span>
          Processo (opcional)
        </div>
        <label>
          Título interno
          <input {...register('title')} placeholder="Ex.: BPC/LOAS - Maria Silva" />
          {errors.title && <small>{errors.title.message}</small>}
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label>
            Número CNJ
            <input {...register('caseNumber')} placeholder="0000000-00.0000.0.00.0000" />
            {errors.caseNumber && <small>{errors.caseNumber.message}</small>}
          </label>
          <label>
            Tribunal
            <input {...register('tribunal')} placeholder="Ex.: TJSP, TRF3" />
          </label>
        </div>

        {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}

        <Button type="submit" disabled={isSubmitting} style={{ marginTop: 8 }}>
          {isSubmitting ? 'Salvando...' : 'Criar caso'}
        </Button>
      </form>
    </div>
  )
}
