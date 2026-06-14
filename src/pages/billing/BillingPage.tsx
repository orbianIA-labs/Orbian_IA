import { Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const plans = [
  { name: 'Gratuito', price: 'R$ 0', items: ['2 casos ativos', '5 pecas por mes', 'Prazos basicos'] },
  { name: 'Solo', price: 'R$ 197', items: ['Casos ilimitados', 'Pecas ilimitadas', 'Comunicacao com clientes'] },
  { name: 'Pro', price: 'R$ 397', items: ['Multiplos usuarios', 'Integracoes avancadas', 'Suporte prioritario'] },
]

export function BillingPage() {
  return (
    <div className="page-stack">
      <section className="page-heading compact">
        <div>
          <p className="eyebrow">Receita</p>
          <h1>Planos da beta</h1>
        </div>
      </section>

      <section className="plan-grid">
        {plans.map((plan) => (
          <article className="plan-card" key={plan.name}>
            <h2>{plan.name}</h2>
            <strong>{plan.price}<small>/mes</small></strong>
            <ul>
              {plan.items.map((item) => (
                <li key={item}>
                  <Check size={16} />
                  {item}
                </li>
              ))}
            </ul>
            <Button variant={plan.name === 'Solo' ? 'primary' : 'secondary'}>Selecionar</Button>
          </article>
        ))}
      </section>
    </div>
  )
}
