const KEY = 'refresh_token'

/**
 * Guarda o refresh token em localStorage (sessão lembrada entre visitas) ou
 * sessionStorage (some ao fechar a aba) conforme o "Lembrar-me" do login.
 */
export const tokenStorage = {
  get(): string | null {
    return localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY)
  },
  set(token: string, remember: boolean) {
    if (remember) {
      localStorage.setItem(KEY, token)
      sessionStorage.removeItem(KEY)
    } else {
      sessionStorage.setItem(KEY, token)
      localStorage.removeItem(KEY)
    }
  },
  /** Atualiza o token mantendo o mesmo local onde já estava guardado. */
  refresh(token: string) {
    this.set(token, localStorage.getItem(KEY) !== null)
  },
  clear() {
    localStorage.removeItem(KEY)
    sessionStorage.removeItem(KEY)
  },
}
