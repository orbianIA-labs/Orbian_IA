import { Copy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { clientMessages } from '@/services/mockData'

export function ClientsPage() {
  return (
    <div className="page-stack">
      <section className="page-heading compact">
        <div>
          <p className="eyebrow">Pilar 3</p>
          <h1>Comunicacao com clientes</h1>
        </div>
      </section>

      <section className="message-list">
        {clientMessages.map((message) => (
          <article className="message-card" key={message.id}>
            <header>
              <div>
                <strong>{message.clientName}</strong>
                <span>{message.caseTitle}</span>
              </div>
              <span className="pill">{message.tone}</span>
            </header>
            <p>{message.message}</p>
            <Button variant="secondary">
              <Copy size={17} />
              Copiar mensagem
            </Button>
          </article>
        ))}
      </section>
    </div>
  )
}
