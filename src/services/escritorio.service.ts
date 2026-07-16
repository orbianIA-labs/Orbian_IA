import api from '@/lib/axios'

export type Escritorio = {
  id: string
  nome: string
  logoUrl: string | null
  endereco: string | null
  telefone: string | null
  cnpj: string | null
}

export type AtualizarEscritorioInput = {
  nome: string
  logoUrl?: string | null
  endereco?: string | null
  telefone?: string | null
  cnpj?: string | null
}

export type Membro = {
  id: string
  nome: string
  email: string
  papel: 'owner' | 'membro'
}

export type Convite = {
  id: string
  email: string
  papel: string
  expiresAt: string
  aceitoEm: string | null
}

export const escritorioService = {
  async obter() {
    const { data } = await api.get<Escritorio | null>('/api/escritorio')
    return data
  },

  async salvar(input: AtualizarEscritorioInput) {
    const { data } = await api.put<Escritorio>('/api/escritorio', input)
    return data
  },

  async listarMembros() {
    const { data } = await api.get<Membro[]>('/api/escritorio/usuarios')
    return data
  },

  async removerMembro(id: string) {
    await api.delete(`/api/escritorio/usuarios/${id}`)
  },

  async convidar(email: string) {
    const { data } = await api.post<Convite>('/api/escritorio/convites', { email })
    return data
  },

  async listarConvites() {
    const { data } = await api.get<Convite[]>('/api/escritorio/convites')
    return data
  },

  async revogarConvite(id: string) {
    await api.delete(`/api/escritorio/convites/${id}`)
  },

  async aceitarConvite(token: string) {
    await api.post(`/api/convites/${token}/aceitar`)
  },
}
