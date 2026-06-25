import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Copy, Download, MessageSquareText, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { OrbianEditor } from '@/components/editor/OrbianEditor'
import { areaLabel, formatDate } from '@/lib/utils'
import { casesService } from '@/services/cases.service'
import { deadlinesService } from '@/services/deadlines.service'
import api from '@/lib/axios'

interface PecaGerada {
  id: string
  casoId: string
  categoria: string
  conteudo: string
  versao: number
  promptReferencia: string
  createdAt: string
}

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: legalCase, isLoading } = useQuery({
    queryKey: ['case', id],
    queryFn: () => casesService.get(id!),
    enabled: !!id,
  })

  const { data: allDeadlines = [] } = useQuery({
    queryKey: ['deadlines'],
    queryFn: deadlinesService.list,
  })

  const { data: pecas = [] } = useQuery<PecaGerada[]>({
    queryKey: ['pecas', id],
    queryFn: () => api.get(`/api/casos/${id}/pecas`).then((r) => r.data),
    enabled: !!id,
  })

  const ultimaPeca = pecas[0] ?? null
  const caseDeadlines = allDeadlines.filter((d) => d.caseId === id)

  const copiarPeca = () => {
    if (!ultimaPeca) return
    const tmp = document.createElement('div')
    tmp.innerHTML = ultimaPeca.conteudo
    navigator.clipboard.writeText(tmp.innerText)
  }

  const exportarWord = () => {
    if (!ultimaPeca) return
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"/></head><body>${ultimaPeca.conteudo}</body></html>`
    const blob = new Blob([html], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${ultimaPeca.categoria.replace(/\s+/g, '_')}_v${ultimaPeca.versao}.doc`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copiarWhatsApp = () => {
    if (!legalCase) return
    const msg = `Olá ${legalCase.clientName}. Sua petição inicial foi concluída. Agora aguardaremos as próximas movimentações processuais. Qualquer novidade entraremos em contato.`
    navigator.clipboard.writeText(msg)
  }

  if (isLoading) return <div className="screen-loader">Carregando caso...</div>
  if (!legalCase) return <div className="page-stack"><p>Caso não encontrado.</p></div>

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">{legalCase.flow || areaLabel(legalCase.area)}</p>
          <h1>{legalCase.clientName}</h1>
          <p>
            {areaLabel(legalCase.area)}
            {legalCase.category ? ` / ${legalCase.category}` : ''}
          </p>
        </div>
        <Button onClick={() => navigate(`/cases/${id}/pecas`)}>
          <Sparkles size={18} />
          Peças com IA
        </Button>
      </section>

      <article className="next-action-panel">
        <div>
          <span>Próxima ação recomendada</span>
          <strong>{legalCase.nextAction}</strong>
        </div>
        <Button variant="secondary" onClick={() => navigate(`/cases/${id}/pecas`)}>
          Executar agora
        </Button>
      </article>

      <section className="two-column">
        <article className="panel">
          <h2>Dados do caso</h2>
          <dl className="definition-list">
            {legalCase.caseNumber && (
              <div>
                <dt>Número CNJ</dt>
                <dd>{legalCase.caseNumber}</dd>
              </div>
            )}
            <div>
              <dt>Área</dt>
              <dd>{areaLabel(legalCase.area)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                {legalCase.status === 'active'
                  ? 'Em andamento'
                  : legalCase.status === 'done'
                    ? 'Concluído'
                    : 'Aguardando'}
              </dd>
            </div>
            <div>
              <dt>Atualizado</dt>
              <dd>{formatDate(legalCase.updatedAt)}</dd>
            </div>
          </dl>
        </article>

        <article className="panel">
          <h2>Prazos do caso</h2>
          {caseDeadlines.length === 0 && (
            <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Nenhum prazo cadastrado</p>
          )}
          <div className="list">
            {caseDeadlines.map((deadline) => (
              <div className="list-row" key={deadline.id}>
                <div>
                  <strong>{deadline.title}</strong>
                  <span>{deadline.businessDaysLeft} dias úteis restantes</span>
                </div>
                <time>{formatDate(deadline.dueDate)}</time>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="two-column">
        <article className="panel">
          <h2>
            {ultimaPeca
              ? `${ultimaPeca.categoria} (v${ultimaPeca.versao})`
              : 'Peça gerada'}
          </h2>
          {ultimaPeca ? (
            <>
              <OrbianEditor content={ultimaPeca.conteudo} readOnly />
              <div className="button-row">
                <Button variant="secondary" onClick={exportarWord}>
                  <Download size={17} />
                  Word
                </Button>
                <Button variant="secondary" onClick={copiarPeca}>
                  <Copy size={17} />
                  Copiar
                </Button>
              </div>
            </>
          ) : (
            <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
              Nenhuma peça gerada ainda.{' '}
              <button
                onClick={() => navigate(`/cases/${id}/pecas`)}
                style={{
                  color: 'var(--accent)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: 14,
                  padding: 0,
                }}
              >
                Gerar com IA
              </button>
            </p>
          )}
        </article>

        <article className="panel">
          <h2>Atualização do cliente</h2>
          <p>
            Olá {legalCase.clientName}. Sua petição inicial foi concluída. Agora aguardaremos as
            próximas movimentações processuais. Qualquer novidade entraremos em contato.
          </p>
          <Button variant="secondary" onClick={copiarWhatsApp}>
            <MessageSquareText size={17} />
            Copiar para WhatsApp
          </Button>
        </article>
      </section>
    </div>
  )
}
