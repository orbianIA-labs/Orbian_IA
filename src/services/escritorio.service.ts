import api from '@/lib/axios'

export type TimbrePosicao =
  | 'superior-esquerda'
  | 'superior-centro'
  | 'superior-direita'
  | 'inferior-esquerda'
  | 'inferior-direita'

export type Escritorio = {
  id: string
  nome: string
  nomeAdvogado: string | null
  oab: string | null
  ufOab: string | null
  cnpj: string | null
  email: string | null
  telefone: string | null
  cidade: string | null
  estado: string | null
  temLogo: boolean
  logoUrl: string | null
  timbrePosicao: TimbrePosicao
  fonteFamilia: string | null
  fonteTamanho: string | null
  rodapeTexto: string | null
  rodapeAtivo: boolean
}

export type AtualizarEscritorioInput = {
  nome: string
  nomeAdvogado?: string | null
  oab?: string | null
  ufOab?: string | null
  cnpj?: string | null
  email?: string | null
  telefone?: string | null
  cidade?: string | null
  estado?: string | null
  timbrePosicao: TimbrePosicao
  fonteFamilia?: string | null
  fonteTamanho?: string | null
  rodapeTexto?: string | null
  rodapeAtivo: boolean
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

export function logoUrlDoEscritorio(escritorioId: string): string {
  return `${api.defaults.baseURL ?? ''}/api/escritorio/${escritorioId}/logo`
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

  async uploadLogo(file: File) {
    const form = new FormData()
    form.append('file', file)
    // Não definir Content-Type manualmente — o axios injeta o boundary do multipart.
    const { data } = await api.post<Escritorio>('/api/escritorio/logo', form)
    return data
  },

  async removerLogo() {
    const { data } = await api.delete<Escritorio>('/api/escritorio/logo')
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
