import { create } from 'zustand'
import type { User } from '@/types/domain.types'

type AuthState = {
  accessToken: string | null
  user: User | null
  setTokens: (accessToken: string, user: User) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setTokens: (accessToken, user) => set({ accessToken, user }),
  clearAuth: () => set({ accessToken: null, user: null }),
}))
