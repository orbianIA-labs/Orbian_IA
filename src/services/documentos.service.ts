import api from '@/lib/axios'

export interface Documento {
  id: string
  nomeArquivo: string
  tipo: string | null
  contentType: string
  tamanhoBytes: number
  createdAt: string
}

export const documentosService = {
  async list(casoId: string): Promise<Documento[]> {
    const { data } = await api.get<Documento[]>(`/api/casos/${casoId}/documentos`)
    return data
  },

  async upload(casoId: string, file: File, tipo?: string): Promise<Documento> {
    const form = new FormData()
    form.append('file', file)
    if (tipo) form.append('tipo', tipo)
    // Não definir Content-Type manualmente — o axios injeta o boundary do multipart.
    const { data } = await api.post<Documento>(`/api/casos/${casoId}/documentos`, form)
    return data
  },

  async remove(docId: string): Promise<void> {
    await api.delete(`/api/documentos/${docId}`)
  },

  async analisar(casoId: string, documentoIds: string[]): Promise<string> {
    const { data } = await api.post<{ analise: string }>(
      `/api/casos/${casoId}/documentos/analisar`,
      { documentoIds },
    )
    return data.analise
  },

  async download(docId: string, nomeArquivo: string): Promise<void> {
    const { data } = await api.get(`/api/documentos/${docId}/download`, { responseType: 'blob' })
    const url = URL.createObjectURL(data as Blob)
    const a = Object.assign(document.createElement('a'), { href: url, download: nomeArquivo })
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
}
