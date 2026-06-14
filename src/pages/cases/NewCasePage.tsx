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
          <input placeholder="(00) 00000-0000" />
        </label>
        <label>
          Email
          <input placeholder="cliente@email.com" />
        </label>
        <label>
          CPF
          <input placeholder="000.000.000-00" />
        </label>
        <label>
          Observacoes
          <input placeholder="Resumo livre do atendimento" />
        </label>

        <h2>Passo 2 / Fluxo especializado</h2>
        <label>
          Area juridica
          <select {...register('area')}>
            <option value="civil">Civel</option>
            <option value="trabalhista">Trabalhista</option>
            <option value="tributario">Tributario</option>
            <option value="penal">Penal</option>
            <option value="familia">Familia</option>
            <option value="consumidor">Consumidor</option>
          </select>
        </label>
        <label>
          Objetivo do caso
          <select>
            <option>Especialista em BPC/LOAS</option>
            <option>Especialista em Aposentadoria</option>
            <option>Especialista em Alimentos</option>
            <option>Especialista em Rescisao</option>
            <option>Especialista em Dano Moral</option>
          </select>
        </label>
        <label>
          Titulo interno
          <input {...register('title')} placeholder="Ex.: BPC/LOAS - Maria Silva" />
          {errors.title && <small>{errors.title.message}</small>}
        </label>

        <h2>Passo 3 / Preenchimento inteligente</h2>
        <label>
          Renda familiar
          <input placeholder="Ex.: R$ 1.800" />
        </label>
        <label>
          Existe documento medico ou prova principal?
          <select>
            <option>Sim</option>
            <option>Nao</option>
            <option>Precisa solicitar</option>
          </select>
        </label>
        <label>
          Numero CNJ
          <input {...register('caseNumber')} placeholder="0000000-00.0000.0.00.0000" />
          {errors.caseNumber && <small>{errors.caseNumber.message}</small>}
        </label>

        <h2>Passo 4 / Documentos recomendados</h2>
        <div className="checklist">
          <span>RG</span>
          <span>CPF</span>
          <span>Comprovante de residencia</span>
          <span>CadUnico ou documento equivalente</span>
          <span>Laudo ou prova principal</span>
        </div>

        <h2>Passo 5 / Financeiro</h2>
        <label>
          Valor da causa
          <input placeholder="R$ 0,00" />
        </label>
        <label>
          Honorarios
          <input placeholder="R$ 0,00" />
        </label>

        <Button type="submit">Salvar e iniciar fluxo</Button>
      </form>
    </div>
  )
}
