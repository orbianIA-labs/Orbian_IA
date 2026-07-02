import api from '@/lib/axios'
import type { CreateCaseInput } from '@/lib/zod-schemas'
import type { CaseStatus, LegalArea, LegalCase } from '@/types/domain.types'

type CasoResponse = {
  id: string
  clienteId: string
  clienteNome: string
  numeroProcesso: string | null
  tribunal: string | null
  areaJuridica: string | null
  categoria: string | null
  status: string
  tipoServico: string | null
  etapaAtual: string
  createdAt: string
  updatedAt: string
}

function mapCaso(c: CasoResponse): LegalCase {
  return {
    id: c.id,
    title: c.clienteNome,
    caseNumber: c.numeroProcesso ?? undefined,
    tribunal: c.tribunal ?? '',
    clientName: c.clienteNome,
    clientPhone: '',
    clientEmail: '',
    clientCpf: '',
    area: (c.areaJuridica ?? 'civil') as LegalArea,
    category: c.categoria ?? '',
    flow: c.categoria ?? '',
    status: (c.status ?? 'em_andamento') as CaseStatus,
    tipoServico: c.tipoServico ?? undefined,
    etapaAtual: (c.etapaAtual ?? 'cadastro') as LegalCase['etapaAtual'],
    progress: 0,
    nextAction: 'Ver detalhes',
    claimValue: 0,
    fees: 0,
    received: 0,
    pending: 0,
    expectedProfit: 0,
    recommendedDocuments: [],
    updatedAt: c.updatedAt,
  }
}

export type CaseFilters = {
  status?: string
  q?: string
}

export type UpdateCasePatch = {
  numeroProcesso?: string | null
  tribunal?: string | null
  areaJuridica?: string | null
  categoria?: string | null
  status?: CaseStatus
  tipoServico?: string | null
  etapaAtual?: string
}

export const casesService = {
  async list(filters: CaseFilters = {}): Promise<LegalCase[]> {
    const { data } = await api.get<CasoResponse[]>('/api/casos', { params: filters })
    return data.map(mapCaso)
  },

  async get(id: string): Promise<LegalCase> {
    const { data } = await api.get<CasoResponse>(`/api/casos/${id}`)
    return mapCaso(data)
  },

  async create(input: CreateCaseInput): Promise<LegalCase> {
    const { data: cliente } = await api.post<{ id: string }>('/api/clientes', {
      nome: input.clientName,
      cpfCnpj: input.clientCpf || null,
      telefone: input.clientPhone || null,
      email: input.clientEmail || null,
    })

    const { data: caso } = await api.post<CasoResponse>('/api/casos', {
      clienteId: cliente.id,
      numeroProcesso: input.caseNumber || null,
      tribunal: input.tribunal || null,
      areaJuridica: input.area,
      categoria: input.flow || null,
      tipoServico: input.tipoServico || null,
    })

    return mapCaso(caso)
  },

  async update(id: string, patch: UpdateCasePatch): Promise<LegalCase> {
    const { data } = await api.patch<CasoResponse>(`/api/casos/${id}`, patch)
    return mapCaso(data)
  },

  async archive(id: string): Promise<LegalCase> {
    return this.update(id, { status: 'arquivado' })
  },
}
