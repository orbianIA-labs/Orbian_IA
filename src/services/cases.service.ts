import type { CreateCaseInput } from '@/lib/zod-schemas'
import { cases } from '@/services/mockData'
import type { LegalCase } from '@/types/domain.types'

export const casesService = {
  async list() {
    return cases
  },

  async get(id: string) {
    return cases.find((item) => item.id === id) ?? cases[0]
  },

  async create(input: CreateCaseInput): Promise<LegalCase> {
    return {
      id: crypto.randomUUID(),
      title: input.title,
      caseNumber: input.caseNumber,
      clientName: input.clientName,
      clientPhone: '',
      clientEmail: '',
      clientCpf: '',
      area: input.area,
      category: 'Fluxo inicial',
      flow: 'Especialista em fluxo inicial',
      status: 'active',
      progress: 20,
      nextAction: 'Iniciar fluxo',
      claimValue: 0,
      fees: 0,
      received: 0,
      pending: 0,
      expectedProfit: 0,
      recommendedDocuments: [],
      updatedAt: new Date().toISOString(),
    }
  },
}
