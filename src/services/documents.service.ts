import { clientMessages, documents } from '@/services/mockData'

export const documentsService = {
  async list() {
    return documents
  },

  async clientMessages() {
    return clientMessages
  },
}
