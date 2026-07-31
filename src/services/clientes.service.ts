import api from '@/lib/axios'

export type Cliente = {
  id: string
  nome: string
  cpfCnpj: string | null
  telefone: string | null
  email: string | null
  createdAt: string
}

export type CriarClienteInput = {
  nome: string
  cpfCnpj?: string | null
  telefone?: string | null
  email?: string | null
}

export type AtualizarClienteInput = Partial<CriarClienteInput>

export const clientesService = {
  async list(q?: string): Promise<Cliente[]> {
    const { data } = await api.get<Cliente[]>('/api/clientes', { params: q ? { q } : undefined })
    return data
  },

  async get(id: string): Promise<Cliente> {
    const { data } = await api.get<Cliente>(`/api/clientes/${id}`)
    return data
  },

  async create(input: CriarClienteInput): Promise<Cliente> {
    const { data } = await api.post<Cliente>('/api/clientes', input)
    return data
  },

  async update(id: string, patch: AtualizarClienteInput): Promise<Cliente> {
    const { data } = await api.patch<Cliente>(`/api/clientes/${id}`, patch)
    return data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/clientes/${id}`)
  },
}
