import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { createCaseSchema, type CreateCaseInput } from '@/lib/zod-schemas'
import { casesService } from '@/services/cases.service'
import { useState } from 'react'

export function NewCasePage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<CreateCaseInput>({
    resolver: zodResolver(createCaseSchema),
    defaultValues: { area: 'civil' },
  })

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
          <h1>Criar caso e iniciar fluxo</h1>
        </div>
      </section>

      <form className="form-panel" onSubmit={handleSubmit(onSubmit)}>
        <h2>Passo 1 / Dados do cliente</h2>
        <label>
          Nome
          <input {...register('clientName')} placeholder="Nome do cliente" />
          {errors.clientName && <small>{errors.clientName.message}</small>}
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
        <label>
          CPF
          <input {...register('clientCpf')} placeholder="000.000.000-00" />
        </label>

        <h2>Passo 2 / Fluxo especializado</h2>
        <label>
          Área jurídica
          <select {...register('area')}>
            <option value="civil">Cível</option>
            <option value="trabalhista">Trabalhista</option>
            <option value="tributario">Tributário</option>
            <option value="penal">Penal</option>
            <option value="familia">Família</option>
            <option value="consumidor">Consumidor</option>
          </select>
        </label>
        <label>
          Objetivo do caso
          <select {...register('flow')}>
            <option value="">Selecione...</option>
            <option value="Especialista em BPC/LOAS">Especialista em BPC/LOAS</option>
            <option value="Especialista em Aposentadoria">Especialista em Aposentadoria</option>
            <option value="Especialista em Alimentos">Especialista em Alimentos</option>
            <option value="Especialista em Rescisão">Especialista em Rescisão</option>
            <option value="Especialista em Dano Moral">Especialista em Dano Moral</option>
          </select>
        </label>
        <label>
          Título interno
          <input {...register('title')} placeholder="Ex.: BPC/LOAS - Maria Silva" />
          {errors.title && <small>{errors.title.message}</small>}
        </label>

        <h2>Passo 3 / Número do processo</h2>
        <label>
          Número CNJ
          <input {...register('caseNumber')} placeholder="0000000-00.0000.0.00.0000" />
          {errors.caseNumber && <small>{errors.caseNumber.message}</small>}
        </label>

        {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Salvar e iniciar fluxo'}
        </Button>
      </form>
    </div>
  )
}
