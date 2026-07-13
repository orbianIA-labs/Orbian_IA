import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { FileUp, Star } from 'lucide-react'
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

const PRIORIDADES = [
  { value: 'alta', label: 'Prioridade Alta' },
  { value: 'media', label: 'Prioridade Média' },
  { value: 'baixa', label: 'Prioridade Baixa' },
] as const

const SITUACOES = [
  { value: 'a_receber', label: 'A Receber' },
  { value: 'parcial', label: 'Parcialmente Recebido' },
  { value: 'recebido', label: 'Recebido' },
] as const

const PIPELINE_TABS = ['Cadastro', 'Documentos', 'Gerar Peças', 'Prazos', 'Revisão', 'Encerramento']

export function NewCasePage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [contrato, setContrato] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [caseId, setCaseId] = useState<string | null>(null)
  const [protocolo, setProtocolo] = useState<number | null>(null)
  const [savingDraft, setSavingDraft] = useState(false)
  const [favorito, setFavorito] = useState(false)

  const {
    formState: { errors, isSubmitting },
    getValues,
    handleSubmit,
    register,
  } = useForm<CreateCaseInput>({
    resolver: zodResolver(createCaseSchema),
    defaultValues: { area: 'civil', prioridade: 'media', situacao: 'a_receber' },
  })

  async function uploadContratoSeHouver(id: string) {
    if (!contrato) return
    try {
      await documentosService.upload(id, contrato, 'Contrato')
    } catch {
      toast('Caso salvo, mas o contrato de honorários falhou no upload. Anexe novamente na tela de documentos.', 'warning')
    }
  }

  async function onSaveDraft() {
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
        await uploadContratoSeHouver(caso.id)
      }
      toast('Rascunho salvo.', 'success')
    } catch {
      toast('Não foi possível salvar o rascunho.', 'error')
    } finally {
      setSavingDraft(false)
    }
  }

  async function onSubmit(input: CreateCaseInput) {
    setError('')
    try {
      if (caseId) {
        await casesService.update(caseId, { rascunho: false, favorito, ...toPatch(input) })
        await uploadContratoSeHouver(caseId)
        navigate(`/cases/${caseId}/documentos`)
        return
      }

      const caso = await casesService.create(input, { rascunho: false, favorito })
      await uploadContratoSeHouver(caso.id)
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
          {PIPELINE_TABS.map((label, i) => (
            <span key={label} className={`pipeline-tab ${i === 0 ? 'active' : 'locked'}`}>
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
                Status Inicial
                <select {...register('statusInicial')} defaultValue="Novo">
                  <option value="Novo">Novo</option>
                  <option value="Em andamento">Em andamento</option>
                  <option value="Aguardando documentos">Aguardando documentos</option>
                </select>
              </label>
            </div>

            <div className="nc-field-quad">
              <label className="nc-field">
                Tribunal
                <input {...register('tribunal')} placeholder="TJSP" />
              </label>
              <label className="nc-field">
                Vara
                <input {...register('vara')} placeholder="2ª Vara" />
              </label>
              <label className="nc-field">
                Comarca
                <input {...register('comarca')} placeholder="São Paulo" />
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
                <input type="number" step="0.01" min="0" {...register('valorCausa', { setValueAs: (v) => v === '' ? undefined : Number(v) })} placeholder="R$ 0,00" />
              </label>
              <label className="nc-field">
                Honorários
                <input type="number" step="0.01" min="0" {...register('honorarios', { setValueAs: (v) => v === '' ? undefined : Number(v) })} placeholder="R$ 0,00" />
              </label>
            </div>

            <div className="nc-field-pair">
              <label className="nc-field">
                Situação
                <select {...register('situacao')}>
                  {SITUACOES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </label>
              <label className="nc-field">
                Data Prevista
                <input type="date" {...register('dataPrevista')} />
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

        <div className="new-case-cta-row">
          <button type="button" className="nc-draft-link" onClick={onSaveDraft} disabled={savingDraft}>
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
    comarca: input.comarca || null,
    uf: input.uf || null,
    areaJuridica: input.area,
    categoria: input.flow || null,
    tipoServico: input.tipoServico || null,
    prioridade: input.prioridade || null,
    statusInicial: input.statusInicial || null,
    situacao: input.situacao || null,
    dataPrevista: input.dataPrevista || null,
    reuNome: input.reuNome || null,
    reuCpfCnpj: input.reuCpfCnpj || null,
    reuAdvogado: input.reuAdvogado || null,
    resumoFatos: input.resumoFatos || null,
    pedidosProvidencias: input.pedidosProvidencias || null,
    valorCausa: input.valorCausa,
    honorarios: input.honorarios,
    valorRecebido: input.valorRecebido,
  }
}
