import { useNavigate, useParams } from 'react-router-dom'
import { Copy, Download, MessageSquareText, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { OrbianEditor } from '@/components/editor/OrbianEditor'
import { areaLabel, formatDate } from '@/lib/utils'
import { cases, deadlines } from '@/services/mockData'

const generatedPiece = `
  <h2>Peticao inicial</h2>
  <p><strong>Cliente:</strong> {{cliente}}</p>
  <p>Os fatos demonstram a necessidade de tutela jurisdicional para solucionar o conflito apresentado.</p>
  <p>Requer o recebimento da presente peca, a citacao da parte contraria e a procedencia dos pedidos.</p>
`

export function CaseDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const legalCase = cases.find((item) => item.id === id) ?? cases[0]
  const caseDeadlines = deadlines.filter((deadline) => deadline.caseId === legalCase.id)

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">{legalCase.flow}</p>
          <h1>{legalCase.clientName}</h1>
          <p>{areaLabel(legalCase.area)} / {legalCase.category}</p>
        </div>
        <Button onClick={() => navigate(`/cases/${id}/pecas`)}>
          <Sparkles size={18} />
          Peças com IA
        </Button>
      </section>

      <article className="next-action-panel">
        <div>
          <span>Proxima acao recomendada</span>
          <strong>{legalCase.nextAction}</strong>
        </div>
        <Button variant="secondary">Executar agora</Button>
      </article>

      <section className="two-column">
        <article className="panel">
          <h2>Dados do caso</h2>
          <dl className="definition-list">
            <div>
              <dt>Telefone</dt>
              <dd>{legalCase.clientPhone}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{legalCase.clientEmail}</dd>
            </div>
            <div>
              <dt>CPF</dt>
              <dd>{legalCase.clientCpf}</dd>
            </div>
            <div>
              <dt>Score do caso</dt>
              <dd>{legalCase.progress}%</dd>
            </div>
            <div>
              <dt>Atualizado</dt>
              <dd>{formatDate(legalCase.updatedAt)}</dd>
            </div>
          </dl>
        </article>

        <article className="panel">
          <h2>Documentos recomendados</h2>
          <div className="checklist">
            {legalCase.recommendedDocuments.map((document) => (
              <span className={document.received ? 'checked' : ''} key={document.name}>
                {document.received ? 'OK' : 'Pendente'} {document.name}
              </span>
            ))}
          </div>
        </article>
      </section>

      <section className="two-column">
        <article className="panel">
          <h2>Peca gerada</h2>
          <OrbianEditor content={generatedPiece} readOnly />
          <div className="button-row">
            <Button variant="secondary">
              <Download size={17} />
              PDF
            </Button>
            <Button variant="secondary">
              <Download size={17} />
              Word
            </Button>
            <Button variant="secondary">
              <Copy size={17} />
              Copiar
            </Button>
          </div>
        </article>

        <article className="panel">
          <h2>Atualizacao do cliente</h2>
          <p>
            Ola {legalCase.clientName}. Sua peticao inicial foi concluida. Agora aguardaremos
            as proximas movimentacoes processuais. Qualquer novidade entraremos em contato.
          </p>
          <Button variant="secondary">
            <MessageSquareText size={17} />
            Copiar para WhatsApp
          </Button>
        </article>
      </section>

      <section className="two-column">
        <article className="panel">
          <h2>Prazos</h2>
          <div className="list">
            {caseDeadlines.map((deadline) => (
              <div className="list-row" key={deadline.id}>
                <div>
                  <strong>{deadline.title}</strong>
                  <span>{deadline.businessDaysLeft} dias uteis restantes</span>
                </div>
                <time>{formatDate(deadline.dueDate)}</time>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>Financeiro do caso</h2>
          <dl className="definition-list">
            <div>
              <dt>Valor da causa</dt>
              <dd>R$ {legalCase.claimValue.toLocaleString('pt-BR')}</dd>
            </div>
            <div>
              <dt>Honorarios</dt>
              <dd>R$ {legalCase.fees.toLocaleString('pt-BR')}</dd>
            </div>
            <div>
              <dt>Recebido</dt>
              <dd>R$ {legalCase.received.toLocaleString('pt-BR')}</dd>
            </div>
            <div>
              <dt>Pendente</dt>
              <dd>R$ {legalCase.pending.toLocaleString('pt-BR')}</dd>
            </div>
            <div>
              <dt>Lucro previsto</dt>
              <dd>R$ {legalCase.expectedProfit.toLocaleString('pt-BR')}</dd>
            </div>
          </dl>
        </article>
      </section>
    </div>
  )
}
