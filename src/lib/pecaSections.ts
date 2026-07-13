// Módulos padrão de uma peça — usados para navegar/checar presença real no conteúdo gerado.
export const MODULOS_PECA = [
  { nome: 'Qualificação', termos: ['qualificação'] },
  { nome: 'Dos Fatos', termos: ['dos fatos'] },
  { nome: 'Fundamentação Jurídica', termos: ['fundamentação', 'do direito'] },
  { nome: 'Dos Pedidos', termos: ['dos pedidos', 'do pedido'] },
  { nome: 'Fechamento', termos: ['fechamento', 'termos em que', 'nestes termos', 'pede deferimento'] },
]

/** Extrai apenas o trecho de HTML (título + parágrafos) de um módulo específico da peça. */
export function extrairSecaoHtml(html: string, termos: string[]): string | null {
  if (!html) return null
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const blocos = Array.from(doc.body.children)

  function ehTitulo(el: Element) {
    if (/^H[1-3]$/.test(el.tagName)) return true
    if (el.tagName === 'P') {
      const texto = el.textContent?.trim() ?? ''
      const soNegrito = el.children.length === 1 && el.children[0].tagName === 'STRONG'
      return texto.length > 0 && (soNegrito || texto === texto.toUpperCase())
    }
    return false
  }

  const idxInicio = blocos.findIndex((el) => {
    if (!ehTitulo(el)) return false
    const texto = el.textContent?.toLowerCase() ?? ''
    return termos.some((t) => texto.includes(t))
  })

  if (idxInicio !== -1) {
    let idxFim = blocos.length
    for (let i = idxInicio + 1; i < blocos.length; i++) {
      if (ehTitulo(blocos[i])) { idxFim = i; break }
    }
    return blocos.slice(idxInicio, idxFim).map((el) => el.outerHTML).join('')
  }

  // Sem título próprio (ex.: "Fechamento" costuma ser só o parágrafo final): devolve o parágrafo que contém o termo.
  const paragrafo = blocos.find((el) => {
    const texto = el.textContent?.toLowerCase() ?? ''
    return termos.some((t) => texto.includes(t))
  })
  return paragrafo ? paragrafo.outerHTML : null
}

export function moduloPresente(html: string, termos: string[]): boolean {
  return extrairSecaoHtml(html, termos) !== null
}
