import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { areaLabel } from '@/lib/utils'
import { templates } from '@/services/mockData'

export function NewDocumentPage() {
  return (
    <div className="page-stack">
      <section className="page-heading compact">
        <div>
          <p className="eyebrow">Wizard de criacao</p>
          <h1>Escolha o tipo de peca</h1>
        </div>
      </section>

      <section className="template-grid">
        {templates.map((template) => (
          <Link className="template-card" key={template.id} to="/documents/editor">
            <span>{areaLabel(template.area)}</span>
            <h2>{template.title}</h2>
            <p>{template.variables.join(', ')}</p>
            <footer>
              <strong>{template.estimatedMinutes} min</strong>
              <ArrowRight size={17} />
            </footer>
          </Link>
        ))}
      </section>
    </div>
  )
}
