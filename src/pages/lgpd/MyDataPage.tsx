import { Download, Trash2, UserRoundPen } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function MyDataPage() {
  return (
    <div className="page-stack">
      <section className="page-heading compact">
        <div>
          <p className="eyebrow">LGPD</p>
          <h1>Meus dados</h1>
        </div>
      </section>

      <section className="lgpd-grid">
        <article className="panel">
          <Download size={22} />
          <h2>Exportar dados</h2>
          <p>Baixe todos os seus dados em JSON quando a API estiver conectada.</p>
          <Button variant="secondary">Exportar</Button>
        </article>
        <article className="panel">
          <UserRoundPen size={22} />
          <h2>Corrigir dados</h2>
          <p>Atualize dados cadastrais e informacoes do escritorio.</p>
          <Button variant="secondary">Ir para perfil</Button>
        </article>
        <article className="panel danger-zone">
          <Trash2 size={22} />
          <h2>Excluir conta</h2>
          <p>Solicite a remocao da conta conforme os prazos legais aplicaveis.</p>
          <Button variant="danger">Solicitar exclusao</Button>
        </article>
      </section>
    </div>
  )
}
