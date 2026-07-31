import api from '@/lib/axios'

export type PrazoStatus = 'seguro' | 'atencao' | 'urgente' | 'concluido'

export type Prazo = {
  id: string
  casoId: string
  casoNumeroProcesso: string | null
  titulo: string
  dataVencimento: string
  responsavel: string | null
  observacoes: string | null
  status: PrazoStatus
  diasUteisRestantes: number
  concluido: boolean
  createdAt: string
}

export type CriarPrazoInput = {
  casoId: string
  titulo: string
  dataVencimento: string
  responsavel?: string | null
  observacoes?: string | null
}

export type AtualizarPrazoInput = {
  titulo?: string
  dataVencimento?: string
  responsavel?: string | null
  observacoes?: string | null
  concluido?: boolean
}

export const prazosService = {
  async list(casoId: string): Promise<Prazo[]> {
    const { data } = await api.get<Prazo[]>('/api/prazos', { params: { casoId } })
    return data
  },

  async create(input: CriarPrazoInput): Promise<Prazo> {
    const { data } = await api.post<Prazo>('/api/prazos', input)
    return data
  },

  async update(id: string, patch: AtualizarPrazoInput): Promise<Prazo> {
    const { data } = await api.patch<Prazo>(`/api/prazos/${id}`, patch)
    return data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/prazos/${id}`)
  },
}
