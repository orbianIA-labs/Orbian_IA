import { deadlines } from '@/services/mockData'

export const deadlinesService = {
  async list() {
    return deadlines
  },
}
