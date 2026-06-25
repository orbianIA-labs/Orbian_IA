import api from '@/lib/axios'
import type { Deadline, DeadlinePriority } from '@/types/domain.types'

type PrazoResponse = {
  id: string
  casoId: string
  casoNumeroProcesso: string | null
  titulo: string
  dataVencimento: string
  responsavel: string | null
  observacoes: string | null
  status: string
  diasUteisRestantes: number
  concluido: boolean
  createdAt: string
}

function mapPriority(status: string): DeadlinePriority {
  if (status === 'critico') return 'critical'
  if (status === 'atencao') return 'attention'
  return 'normal'
}

function mapPrazo(p: PrazoResponse): Deadline {
  return {
    id: p.id,
    caseId: p.casoId,
    caseTitle: p.casoNumeroProcesso ?? 'Processo',
    title: p.titulo,
    dueDate: p.dataVencimento,
    businessDaysLeft: p.diasUteisRestantes,
    priority: mapPriority(p.status),
    completed: p.concluido,
  }
}

export const deadlinesService = {
  async list(): Promise<Deadline[]> {
    const { data } = await api.get<PrazoResponse[]>('/api/prazos')
    return data.map(mapPrazo)
  },

  async create(payload: {
    casoId: string
    titulo: string
    dataVencimento: string
    responsavel?: string
    observacoes?: string
  }): Promise<Deadline> {
    const { data } = await api.post<PrazoResponse>('/api/prazos', payload)
    return mapPrazo(data)
  },

  async complete(id: string): Promise<Deadline> {
    const { data } = await api.patch<PrazoResponse>(`/api/prazos/${id}`, { concluido: true })
    return mapPrazo(data)
  },
}
