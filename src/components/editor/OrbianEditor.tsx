import { Extension, Mark } from '@tiptap/core'
import CharacterCount from '@tiptap/extension-character-count'
import FontFamily from '@tiptap/extension-font-family'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle } from '@tiptap/extension-text-style'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold, Heading1, Heading2, Heading3, Indent, Italic, List, ListOrdered,
  Quote, Redo2, Strikethrough, Undo2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

type OrbianEditorProps = {
  content: string
  readOnly?: boolean
  onChange?: (html: string) => void
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

const FONTES = [
  { value: '', label: 'Fonte padrão' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: '"Times New Roman", serif', label: 'Times New Roman' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Calibri, sans-serif', label: 'Calibri' },
]

const TAMANHOS = [
  { value: '', label: 'Tamanho' },
  { value: '12px', label: '12' },
  { value: '14px', label: '14' },
  { value: '16px', label: '16' },
  { value: '18px', label: '18' },
  { value: '20px', label: '20' },
]

function ToolbarButton({
  active, disabled, label, onClick, children,
}: {
  active?: boolean
  disabled?: boolean
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      aria-label={label}
      title={label}
      variant="ghost"
      className={cn('editor-toolbar-btn', active && 'active')}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null
  return (
    <div className="editor-toolbar">
      <ToolbarButton label="Título 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 size={17} />
      </ToolbarButton>
      <ToolbarButton label="Título 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 size={17} />
      </ToolbarButton>
      <ToolbarButton label="Título 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 size={17} />
      </ToolbarButton>

      <span className="editor-toolbar-sep" />

      <ToolbarButton label="Negrito" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold size={17} />
      </ToolbarButton>
      <ToolbarButton label="Itálico" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic size={17} />
      </ToolbarButton>
      <ToolbarButton label="Tachado" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough size={17} />
      </ToolbarButton>

      <span className="editor-toolbar-sep" />

      <ToolbarButton label="Lista com marcadores" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List size={17} />
      </ToolbarButton>
      <ToolbarButton label="Lista numerada" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered size={17} />
      </ToolbarButton>
      <ToolbarButton label="Citação" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote size={17} />
      </ToolbarButton>
      <ToolbarButton label="Destaque (recuo para lei/jurisprudência)" active={editor.isActive('destaque')} onClick={() => editor.chain().focus().toggleDestaque().run()}>
        <Indent size={17} />
      </ToolbarButton>

      <span className="editor-toolbar-sep" />

      <select
        className="editor-toolbar-select"
        title="Fonte"
        value={editor.getAttributes('textStyle').fontFamily ?? ''}
        onChange={(e) => {
          const v = e.target.value
          if (v) editor.chain().focus().setFontFamily(v).run()
          else editor.chain().focus().unsetFontFamily().run()
        }}
      >
        {FONTES.map((f) => <option key={f.label} value={f.value}>{f.label}</option>)}
      </select>

      <select
        className="editor-toolbar-select"
        title="Tamanho da fonte"
        value={editor.getAttributes('textStyle').fontSize ?? ''}
        onChange={(e) => {
          const v = e.target.value
          if (v) editor.chain().focus().setFontSize(v).run()
          else editor.chain().focus().unsetFontSize().run()
        }}
      >
        {TAMANHOS.map((t) => <option key={t.label} value={t.value}>{t.label}</option>)}
      </select>

      <span className="editor-toolbar-sep" />

      <ToolbarButton label="Desfazer" onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 size={17} />
      </ToolbarButton>
      <ToolbarButton label="Refazer" onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 size={17} />
      </ToolbarButton>
    </div>
  )
}

export function OrbianEditor({ content, readOnly = false, onChange }: OrbianEditorProps) {
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
      {!readOnly && <Toolbar editor={editor} />}
      <EditorContent className="Orbian-editor" editor={editor} />
      {!readOnly && (
        <footer className="editor-footer">{editor?.storage.characterCount.words() ?? 0} palavras</footer>
      )}
    </section>
  )
}
