import { Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 'R$ 0',
    period: 'para sempre',
    description: 'Para conhecer a plataforma e testar os fluxos basicos.',
    features: [
      '3 casos ativos',
      '2 pecas por mes',
      'Prazos manuais',
      'Suporte por e-mail',
    ],
    cta: 'Plano atual',
    highlight: false,
  },
  {
    id: 'solo',
    name: 'Solo',
    price: 'R$ 79',
    period: 'por mes',
    description: 'Para o advogado autonomo que quer executar mais em menos tempo.',
    features: [
      'Casos ilimitados',
      '30 pecas por mes com IA',
      'Controle de prazos automatico',
      'Atualizacao de cliente via WhatsApp',
      'Exportacao PDF e Word',
      'Suporte por e-mail',
    ],
    cta: 'Fazer upgrade',
    highlight: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R$ 149',
    period: 'por mes',
    description: 'Para escritorios pequenos que precisam de mais capacidade e controle.',
    features: [
      'Tudo do Solo',
      'Pecas ilimitadas com IA',
      'Ate 3 usuarios',
      'Relatorios financeiros',
      'Integracao com sistemas processuais',
      'Gerente de conta dedicado',
    ],
    cta: 'Fazer upgrade',
    highlight: false,
  },
]

export function AdminPage() {
  const currentPlan = useAuthStore((s) => s.user?.plan ?? 'free')

  return (
    <div className="page-stack narrow" style={{ maxWidth: 960, margin: '0 auto' }}>
      <section className="page-heading compact">
        <div>
          <p className="eyebrow">Plano e faturamento</p>
          <h1>Seu plano</h1>
          <p>Escolha o plano ideal para o seu escritorio. Cancele quando quiser.</p>
        </div>
      </section>

      <div className="plan-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan
          return (
            <article
              key={plan.id}
              className="plan-card"
              style={
                plan.highlight
                  ? { borderColor: 'var(--primary)', background: 'var(--accent-soft)' }
                  : isCurrent
                    ? { borderColor: 'var(--line-strong)' }
                    : undefined
              }
            >
              {plan.highlight && (
                <p className="eyebrow" style={{ marginBottom: 0 }}>Mais popular</p>
              )}

              <div>
                <h2 style={{ fontSize: 20, marginBottom: 4 }}>{plan.name}</h2>
                <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                  {plan.description}
                </p>
              </div>

              <div>
                <strong style={{ fontSize: 38, fontFamily: 'Georgia, serif' }}>{plan.price}</strong>
                <small style={{ color: 'var(--muted)', fontSize: 13, marginLeft: 6 }}>
                  {plan.period}
                </small>
              </div>

              <ul>
                {plan.features.map((feat) => (
                  <li key={feat}>
                    <Check size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    {feat}
                  </li>
                ))}
              </ul>

              <Button
                variant={isCurrent ? 'secondary' : plan.highlight ? 'primary' : 'secondary'}
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={isCurrent}
              >
                {isCurrent ? `Plano atual (${plan.name})` : plan.cta}
              </Button>
            </article>
          )
        })}
      </div>

      <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
        Precisa de um plano personalizado para seu escritorio?{' '}
        <a href="mailto:contato@Orbian.app" style={{ color: 'var(--accent)', fontWeight: 700 }}>
          Fale com a gente
        </a>
      </p>
    </div>
  )
}
