import api from '@/lib/axios'
import type { Movimentacao, MovimentacaoRecente } from '@/types/domain.types'

type MovimentacaoResponse = {
  id: string
  casoId: string
  dataMovimentacao: string
  descricao: string
  fonte: string
  createdAt: string
}

type MovimentacaoRecenteResponse = {
  id: string
  casoId: string
  clienteNome: string
  numeroProcesso: string | null
  dataMovimentacao: string
  descricao: string
}

export type AtualizarProcessoResult = {
  novasMovimentacoes: number
  totalMovimentacoes: number
  provedor: string
}

function mapMov(m: MovimentacaoResponse): Movimentacao {
  return {
    id: m.id,
    caseId: m.casoId,
    date: m.dataMovimentacao,
    description: m.descricao,
    source: m.fonte,
  }
}

export const monitoringService = {
  async list(casoId: string): Promise<Movimentacao[]> {
    const { data } = await api.get<MovimentacaoResponse[]>(`/api/casos/${casoId}/movimentacoes`)
    return data.map(mapMov)
  },

  async atualizar(casoId: string): Promise<AtualizarProcessoResult> {
    const { data } = await api.post<AtualizarProcessoResult>(`/api/casos/${casoId}/atualizar`)
    return data
  },

  async recentes(limit = 8): Promise<MovimentacaoRecente[]> {
    const { data } = await api.get<MovimentacaoRecenteResponse[]>('/api/movimentacoes/recentes', {
      params: { limit },
    })
    return data.map((m) => ({
      id: m.id,
      caseId: m.casoId,
      clientName: m.clienteNome,
      caseNumber: m.numeroProcesso ?? undefined,
      date: m.dataMovimentacao,
      description: m.descricao,
    }))
  },
}
