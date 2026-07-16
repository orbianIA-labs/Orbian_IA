import api from '@/lib/axios'

export type PerfilDto = {
  id: string
  nome: string
  email: string
  plano: string
  escritorioId: string | null
  papelEscritorio: 'owner' | 'membro'
  twoFactorEnabled: boolean
}

export type IaPreferencias = {
  tom: 'formal' | 'tecnico' | 'direto'
  fortalecerFundamentacao: boolean
  sugerirJurisprudencia: boolean
  verificarClareza: boolean
  contraArgumentacao: boolean
}

export type PlanoLimites = {
  casosAtivosMax: number
  usuariosMax: number
  geracoesIaPorMes: number
}

export type Assinatura = {
  plano: string
  limites: PlanoLimites
  cobrancaConfigurada: boolean
}

export type Sessao = {
  id: string
  createdAt: string
  expiresAt: string
}

export type TotpSetup = {
  secret: string
  provisioningUri: string
}

export const usuariosService = {
  async obterPerfil() {
    const { data } = await api.get<PerfilDto>('/api/usuarios/me')
    return data
  },

  async atualizarPerfil(nome: string, email: string) {
    const { data } = await api.put<PerfilDto>('/api/usuarios/me', { nome, email })
    return data
  },

  async alterarSenha(senhaAtual: string, novaSenha: string) {
    await api.post('/api/usuarios/me/senha', { senhaAtual, novaSenha })
  },

  async obterIaPreferencias() {
    const { data } = await api.get<IaPreferencias>('/api/usuarios/me/ia-preferencias')
    return data
  },

  async atualizarIaPreferencias(prefs: IaPreferencias) {
    const { data } = await api.put<IaPreferencias>('/api/usuarios/me/ia-preferencias', prefs)
    return data
  },

  async obterAssinatura() {
    const { data } = await api.get<Assinatura>('/api/usuarios/me/assinatura')
    return data
  },

  async listarSessoes() {
    const { data } = await api.get<Sessao[]>('/api/usuarios/me/sessoes')
    return data
  },

  async revogarSessao(id: string) {
    await api.delete(`/api/usuarios/me/sessoes/${id}`)
  },

  async setup2fa() {
    const { data } = await api.post<TotpSetup>('/api/usuarios/me/2fa/setup')
    return data
  },

  async habilitar2fa(codigo: string) {
    await api.post('/api/usuarios/me/2fa/habilitar', { codigo })
  },

  async desabilitar2fa(codigo: string) {
    await api.post('/api/usuarios/me/2fa/desabilitar', { codigo })
  },
}
