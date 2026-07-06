import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

let isRefreshing = false
let pendingRequests: Array<(token: string) => void> = []

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true

      if (!isRefreshing) {
        isRefreshing = true
        try {
          const refreshToken = localStorage.getItem('refresh_token')
          if (!refreshToken) throw new Error('No refresh token')

          const { data } = await axios.post(
            '/api/auth/refresh',
            { refreshToken },
          )

          localStorage.setItem('refresh_token', data.refreshToken)
          useAuthStore.getState().setTokens(data.accessToken, {
            id: data.usuario.id,
            name: data.usuario.nome,
            email: data.usuario.email,
            plan: data.usuario.plano,
          })

          pendingRequests.forEach((cb) => cb(data.accessToken))
          pendingRequests = []
        } catch {
          localStorage.removeItem('refresh_token')
          useAuthStore.getState().clearAuth()
          window.location.href = '/#/login'
          return Promise.reject(error)
        } finally {
          isRefreshing = false
        }
      }

      return new Promise((resolve) => {
        pendingRequests.push((token) => {
          original.headers.Authorization = `Bearer ${token}`
          resolve(api(original))
        })
      })
    }

    return Promise.reject(error)
  },
)

export default api
