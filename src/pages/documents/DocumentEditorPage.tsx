import { Download, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { LexioEditor } from '@/components/editor/LexioEditor'

const initialContent = `
  <h2>Excelentissimo Senhor Doutor Juiz de Direito</h2>
  <p><strong>{{cliente}}</strong>, por seu advogado, vem propor a presente acao em face de <strong>{{parte_contraria}}</strong>.</p>
  <p>Os fatos demonstram falha na prestacao de servico, com prejuizos materiais e morais ao consumidor.</p>
  <p>Requer a citacao da parte contraria, a inversao do onus da prova e a condenacao conforme os pedidos abaixo.</p>
`

export function DocumentEditorPage() {
  return (
    <div className="page-stack">
      <section className="page-heading compact">
        <div>
          <p className="eyebrow">Rascunho guiado</p>
          <h1>Peticao inicial - consumidor</h1>
        </div>
        <div className="button-row">
          <Button variant="secondary">
            <Sparkles size={18} />
            Adaptar com IA
          </Button>
          <Button>
            <Download size={18} />
            Exportar Word
          </Button>
        </div>
      </section>

      <LexioEditor content={initialContent} />
    </div>
  )
}
