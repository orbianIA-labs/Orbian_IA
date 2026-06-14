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
      area: input.area,
      status: 'active',
      updatedAt: new Date().toISOString(),
    }
  },
}
