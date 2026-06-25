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
  createdAt: string
  updatedAt: string
}

function mapStatus(s: string): CaseStatus {
  if (s === 'concluido') return 'done'
  if (s === 'arquivado') return 'waiting'
  return 'active'
}

function mapCaso(c: CasoResponse): LegalCase {
  return {
    id: c.id,
    title: c.clienteNome,
    caseNumber: c.numeroProcesso ?? undefined,
    clientName: c.clienteNome,
    clientPhone: '',
    clientEmail: '',
    clientCpf: '',
    area: (c.areaJuridica ?? 'civil') as LegalArea,
    category: c.categoria ?? '',
    flow: c.categoria ?? '',
    status: mapStatus(c.status),
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

export const casesService = {
  async list(): Promise<LegalCase[]> {
    const { data } = await api.get<CasoResponse[]>('/api/casos')
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
      areaJuridica: input.area,
      categoria: input.flow || null,
    })

    return mapCaso(caso)
  },
}
