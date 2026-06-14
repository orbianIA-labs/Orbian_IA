import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { createCaseSchema, type CreateCaseInput } from '@/lib/zod-schemas'
import { casesService } from '@/services/cases.service'

export function NewCasePage() {
  const navigate = useNavigate()
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<CreateCaseInput>({
    resolver: zodResolver(createCaseSchema),
    defaultValues: { area: 'civil' },
  })

  async function onSubmit(input: CreateCaseInput) {
    await casesService.create(input)
    navigate('/cases')
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
        <label>
          Titulo
          <input {...register('title')} placeholder="Ex.: Indenizacao por dano moral" />
          {errors.title && <small>{errors.title.message}</small>}
        </label>
        <label>
          Cliente
          <input {...register('clientName')} placeholder="Nome do cliente" />
          {errors.clientName && <small>{errors.clientName.message}</small>}
        </label>
        <label>
          Numero CNJ
          <input {...register('caseNumber')} placeholder="0000000-00.0000.0.00.0000" />
          {errors.caseNumber && <small>{errors.caseNumber.message}</small>}
        </label>
        <label>
          Area
          <select {...register('area')}>
            <option value="civil">Civel</option>
            <option value="trabalhista">Trabalhista</option>
            <option value="tributario">Tributario</option>
            <option value="penal">Penal</option>
            <option value="familia">Familia</option>
            <option value="consumidor">Consumidor</option>
          </select>
        </label>
        <Button type="submit">Salvar caso</Button>
      </form>
    </div>
  )
}
