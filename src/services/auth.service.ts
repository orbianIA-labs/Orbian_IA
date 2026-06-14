import { demoUser } from '@/services/mockData'

export const authService = {
  async login() {
    return {
      accessToken: 'demo-access-token',
      user: demoUser,
    }
  },

  async checkSession() {
    return {
      accessToken: 'demo-access-token',
      user: demoUser,
    }
  },
}
