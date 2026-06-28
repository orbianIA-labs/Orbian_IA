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
  if (status === 'urgente') return 'critical'
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
    responsavel: p.responsavel ?? '',
    observacoes: p.observacoes ?? '',
  }
}

export type CreateDeadlineInput = {
  casoId: string
  titulo: string
  dataVencimento: string
  responsavel?: string
  observacoes?: string
}

export type UpdateDeadlinePatch = {
  titulo?: string
  dataVencimento?: string
  responsavel?: string
  observacoes?: string
  concluido?: boolean
}

export const deadlinesService = {
  async list(): Promise<Deadline[]> {
    const { data } = await api.get<PrazoResponse[]>('/api/prazos')
    return data.map(mapPrazo)
  },

  async create(payload: CreateDeadlineInput): Promise<Deadline> {
    const { data } = await api.post<PrazoResponse>('/api/prazos', payload)
    return mapPrazo(data)
  },

  async update(id: string, patch: UpdateDeadlinePatch): Promise<Deadline> {
    const { data } = await api.patch<PrazoResponse>(`/api/prazos/${id}`, patch)
    return mapPrazo(data)
  },

  async complete(id: string): Promise<Deadline> {
    return this.update(id, { concluido: true })
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/prazos/${id}`)
  },

  async sendReminders(): Promise<{ prazos: number; mensagem: string }> {
    const { data } = await api.post<{ prazos: number; mensagem: string }>('/api/prazos/lembretes')
    return data
  },
}
