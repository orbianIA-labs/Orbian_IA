import api from '@/lib/axios'
import type { Etapa } from '@/types/domain.types'

type EtapaDto = { id: string; titulo: string; concluida: boolean; ordem: number; createdAt: string }

const map = (d: EtapaDto): Etapa => ({
  id: d.id,
  titulo: d.titulo,
  concluida: d.concluida,
  ordem: d.ordem,
  createdAt: d.createdAt,
})

export const etapasService = {
  async list(casoId: string): Promise<Etapa[]> {
    const { data } = await api.get<EtapaDto[]>(`/api/casos/${casoId}/etapas`)
    return data.map(map)
  },

  async create(casoId: string, titulo: string, ordem: number): Promise<Etapa> {
    const { data } = await api.post<EtapaDto>(`/api/casos/${casoId}/etapas`, { titulo, ordem })
    return map(data)
  },

  async update(etapaId: string, patch: { titulo?: string; concluida?: boolean; ordem?: number }): Promise<Etapa> {
    const { data } = await api.patch<EtapaDto>(`/api/etapas/${etapaId}`, patch)
    return map(data)
  },

  async remove(etapaId: string): Promise<void> {
    await api.delete(`/api/etapas/${etapaId}`)
  },
}
