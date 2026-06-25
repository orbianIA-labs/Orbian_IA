import api from '@/lib/axios'
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
  async login(email: string, senha: string) {
    const { data } = await api.post<AuthApiResponse>('/api/auth/login', { email, senha })
    localStorage.setItem('refresh_token', data.refreshToken)
    return { accessToken: data.accessToken, user: mapUser(data.usuario) }
  },

  async checkSession() {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) throw new Error('Sem sessão ativa')
    const { data } = await api.post<AuthApiResponse>('/api/auth/refresh', { refreshToken })
    localStorage.setItem('refresh_token', data.refreshToken)
    return { accessToken: data.accessToken, user: mapUser(data.usuario) }
  },

  async logout() {
    const refreshToken = localStorage.getItem('refresh_token')
    if (refreshToken) {
      await api.post('/api/auth/logout', { refreshToken }).catch(() => {})
      localStorage.removeItem('refresh_token')
    }
  },
}
