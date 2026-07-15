import api from '@/lib/axios'
import { tokenStorage } from '@/lib/tokenStorage'
import type { User } from '@/types/domain.types'

type AuthApiResponse = {
  accessToken: string
  refreshToken: string
  usuario: { id: string; nome: string; email: string; plano: string }
}

function mapUser(dto: AuthApiResponse['usuario']): User {
  return {
    id: dto.id,
    name: dto.nome,
    email: dto.email,
    plan: dto.plano as User['plan'],
  }
}

export const authService = {
  async register(nome: string, email: string, senha: string, remember = true) {
    const { data } = await api.post<AuthApiResponse>('/api/auth/register', { nome, email, senha })
    tokenStorage.set(data.refreshToken, remember)
    return { accessToken: data.accessToken, user: mapUser(data.usuario) }
  },

  async login(email: string, senha: string, remember = true) {
    const { data } = await api.post<AuthApiResponse>('/api/auth/login', { email, senha })
    tokenStorage.set(data.refreshToken, remember)
    return { accessToken: data.accessToken, user: mapUser(data.usuario) }
  },

  async checkSession() {
    const refreshToken = tokenStorage.get()
    if (!refreshToken) throw new Error('Sem sessão ativa')
    const { data } = await api.post<AuthApiResponse>('/api/auth/refresh', { refreshToken })
    tokenStorage.refresh(data.refreshToken)
    return { accessToken: data.accessToken, user: mapUser(data.usuario) }
  },

  async logout() {
    const refreshToken = tokenStorage.get()
    if (refreshToken) {
      await api.post('/api/auth/logout', { refreshToken }).catch(() => {})
      tokenStorage.clear()
    }
  },
}
