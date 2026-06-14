import { FilePlus2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import { documents } from '@/services/mockData'

export function DocumentsPage() {
  return (
    <div className="page-stack">
      <section className="page-heading compact">
        <div>
          <p className="eyebrow">Pilar 1</p>
          <h1>Pecas juridicas</h1>
        </div>
        <Link to="/documents/new">
          <Button>
            <FilePlus2 size={18} />
            Nova peca
          </Button>
        </Link>
      </section>

      <section className="data-table">
        {documents.map((document) => (
          <Link className="table-row" key={document.id} to={`/documents/${document.id}`}>
            <div>
              <strong>{document.title}</strong>
              <span>{document.templateTitle}</span>
            </div>
            <span>{document.caseTitle}</span>
            <span>{document.wordCount} palavras</span>
            <time>{formatDate(document.updatedAt)}</time>
          </Link>
        ))}
      </section>
    </div>
  )
}
