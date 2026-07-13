import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Circle, FileUp } from 'lucide-react'
import { createCaseSchema, type CreateCaseInput } from '@/lib/zod-schemas'
import { casesService } from '@/services/cases.service'
import { documentosService } from '@/services/documentos.service'
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

const PIPELINE_TABS = ['Cadastro', 'Documentos', 'Gerar Peças', 'Prazos', 'Revisão', 'Encerramento']

export function NewCasePage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [contrato, setContrato] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)

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

      if (contrato) {
        try {
          await documentosService.upload(caso.id, contrato, 'Contrato')
        } catch {
          toast('Caso criado, mas o contrato de honorários falhou no upload. Anexe novamente na tela de documentos.', 'warning')
        }
      }

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
        </div>
        <nav className="pipeline-tabs">
          {PIPELINE_TABS.map((label, i) => (
            <span key={label} className={`pipeline-tab ${i === 0 ? 'active' : 'locked'}`}>
              {i === 0 ? <span className="pipeline-tab-dot" /> : <Circle size={11} />}
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
              <label className="nc-field">
                Cliente *
                <input {...register('clientName')} placeholder="Nome ou CPF/CNPJ" />
                {errors.clientName && <small>{errors.clientName.message}</small>}
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
                Tribunal
                <input {...register('tribunal')} placeholder="TJSP" />
              </label>
            </div>
          </section>

          <section className="new-case-card">
            <p className="section-label-lg">Financeiro</p>
            <p className="new-case-card-sub">Informações financeiras vinculadas ao caso.</p>

            <div className="nc-field-pair">
              <label className="nc-field">
                Valor da Causa
                <input type="number" step="0.01" min="0" {...register('valorCausa', { setValueAs: (v) => v === '' ? undefined : Number(v) })} placeholder="R$ 0,00" />
              </label>
              <label className="nc-field">
                Honorários
                <input type="number" step="0.01" min="0" {...register('honorarios', { setValueAs: (v) => v === '' ? undefined : Number(v) })} placeholder="R$ 0,00" />
              </label>
            </div>

            <label className="nc-field">
              Já recebido
              <input type="number" step="0.01" min="0" {...register('valorRecebido', { setValueAs: (v) => v === '' ? undefined : Number(v) })} placeholder="R$ 0,00" />
            </label>

            <p className="nc-field" style={{ marginTop: 20 }}>Contrato de Honorários</p>
            <div
              className={`nc-upload-zone ${dragOver ? 'drag' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) setContrato(e.dataTransfer.files[0]) }}
              onClick={() => document.getElementById('nc-contrato-input')?.click()}
            >
              <input
                id="nc-contrato-input"
                type="file"
                style={{ display: 'none' }}
                accept=".pdf,.doc,.docx"
                onChange={(e) => { if (e.target.files?.[0]) setContrato(e.target.files[0]); e.target.value = '' }}
              />
              <span className="nc-upload-icon"><FileUp size={18} /></span>
              <strong>{contrato ? contrato.name : 'Arraste ou clique para upload'}</strong>
              <p>PDF, DOCX (máx. 10MB)</p>
            </div>
          </section>
        </div>

        {error && <p className="new-case-error">{error}</p>}
      </div>
    </form>
  )
}
