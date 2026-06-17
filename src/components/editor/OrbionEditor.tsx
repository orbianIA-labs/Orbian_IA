import CharacterCount from '@tiptap/extension-character-count'
import Placeholder from '@tiptap/extension-placeholder'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Italic, List, Redo2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

type OrbianEditorProps = {
  content: string
  readOnly?: boolean
}

export function OrbianEditor({ content, readOnly = false }: OrbianEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Comece a adaptar a peca...' }),
      CharacterCount,
    ],
    content,
    editable: !readOnly,
  })

  return (
    <section className="editor-frame">
      {!readOnly && (
        <div className="editor-toolbar">
          <Button
            aria-label="Negrito"
            title="Negrito"
            variant="ghost"
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold size={17} />
          </Button>
          <Button
            aria-label="Italico"
            title="Italico"
            variant="ghost"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic size={17} />
          </Button>
          <Button
            aria-label="Lista"
            title="Lista"
            variant="ghost"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <List size={17} />
          </Button>
          <Button
            aria-label="Desfazer"
            title="Desfazer"
            variant="ghost"
            onClick={() => editor?.chain().focus().undo().run()}
          >
            <Undo2 size={17} />
          </Button>
          <Button
            aria-label="Refazer"
            title="Refazer"
            variant="ghost"
            onClick={() => editor?.chain().focus().redo().run()}
          >
            <Redo2 size={17} />
          </Button>
        </div>
      )}
      <EditorContent className="Orbian-editor" editor={editor} />
      {!readOnly && (
        <footer className="editor-footer">{editor?.storage.characterCount.words() ?? 0} palavras</footer>
      )}
    </section>
  )
}
