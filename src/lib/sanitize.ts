import DOMPurify, { type Config } from 'dompurify'

/**
 * Tags e atributos que o editor de peças (OrbianEditor/Tiptap) realmente produz:
 * formatação básica de texto, span.peca-destaque (citação de lei/jurisprudência)
 * e span/estilos inline de fonte/tamanho. Qualquer coisa fora disso (script,
 * iframe, onerror, etc.) é removida.
 */
const CONFIG: Config = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'span', 'div',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote',
    'code', 'pre', 'hr', 'a',
  ],
  ALLOWED_ATTR: ['class', 'style', 'href', 'target', 'rel'],
}

/** Sanitiza HTML antes de renderizar via dangerouslySetInnerHTML — o conteúdo de
 *  uma peça é texto rico editável pelo próprio usuário e persistido no banco, então
 *  precisa ser tratado como não confiável na hora de exibir. */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, CONFIG)
}
