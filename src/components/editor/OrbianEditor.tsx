import { Extension, Mark } from '@tiptap/core'
import CharacterCount from '@tiptap/extension-character-count'
import FontFamily from '@tiptap/extension-font-family'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle } from '@tiptap/extension-text-style'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

type OrbianEditorProps = {
  content: string
  readOnly?: boolean
  onChange?: (html: string) => void
  /** Padrão do escritório: só pré-preenche o visual, não trava a troca por peça no seletor da toolbar. */
  defaultFontFamily?: string | null
  defaultFontSize?: string | null
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType
      unsetFontSize: () => ReturnType
    }
    destaque: {
      toggleDestaque: () => ReturnType
    }
  }
}

// Extensão local: Tiptap não tem tamanho de fonte nativo, então guardamos como atributo do textStyle.
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] }
  },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (element: HTMLElement) => element.style.fontSize || null,
          renderHTML: (attributes: { fontSize?: string | null }) => {
            if (!attributes.fontSize) return {}
            return { style: `font-size: ${attributes.fontSize}` }
          },
        },
      },
    }]
  },
  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }) => chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize: () => ({ chain }) => chain().setMark('textStyle', { fontSize: null }).run(),
    }
  },
})

// Marca "destaque": recuo padrão para trechos de jurisprudência/lei citados na peça.
const Destaque = Mark.create({
  name: 'destaque',
  parseHTML() {
    return [{ tag: 'span.peca-destaque' }]
  },
  renderHTML() {
    return ['span', { class: 'peca-destaque' }, 0]
  },
  addCommands() {
    return {
      toggleDestaque: () => ({ commands }) => commands.toggleMark(this.name),
    }
  },
})

export const FONTES = [
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: '"Times New Roman", serif', label: 'Times New Roman' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Calibri, sans-serif', label: 'Calibri' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: 'Garamond, serif', label: 'Garamond' },
]

export const TAMANHOS = [
  { value: '', label: 'Tamanho' },
  { value: '12px', label: '12' },
  { value: '14px', label: '14' },
  { value: '16px', label: '16' },
  { value: '18px', label: '18' },
  { value: '20px', label: '20' },
]

export function OrbianEditor({
  content, readOnly = false, onChange, defaultFontFamily, defaultFontSize,
}: OrbianEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Comece a adaptar a peca...' }),
      CharacterCount,
      TextStyle,
      FontFamily,
      FontSize,
      Destaque,
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
  })

  return (
    <section className="editor-frame">
      <EditorContent
        className="Orbian-editor"
        editor={editor}
        style={{
          fontFamily: defaultFontFamily || undefined,
          fontSize: defaultFontSize || undefined,
        }}
      />
      {!readOnly && (
        <footer className="editor-footer">{editor?.storage.characterCount.words() ?? 0} palavras</footer>
      )}
    </section>
  )
}
