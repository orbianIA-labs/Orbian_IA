import { useState } from 'react'
import { AlertTriangle, ArrowRightLeft, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ClienteCombobox } from '@/components/ui/ClienteCombobox'
import type { Cliente } from '@/services/clientes.service'

type Props = {
  open: boolean
  clienteNome: string
  casosAtivos: number
  clientesDisponiveis: Cliente[]
  transferindo: boolean
  excluindo: boolean
  onCancel: () => void
  onTransferir: (destinoId: string) => void
  onExcluirMesmoAssim: () => void
}

export function ResolverClienteComCasosDialog({
  open, clienteNome, casosAtivos, clientesDisponiveis, transferindo, excluindo,
  onCancel, onTransferir, onExcluirMesmoAssim,
}: Props) {
  const [modo, setModo] = useState<'escolha' | 'transferir'>('escolha')
  const [destinoId, setDestinoId] = useState('')

  if (!open) return null

  function fechar() {
    setModo('escolha')
    setDestinoId('')
    onCancel()
  }

  return (
    <div className="confirm-dialog-overlay" onClick={fechar}>
      <div className="confirm-dialog confirm-dialog-wide" onClick={(e) => e.stopPropagation()}>
        <span className="confirm-dialog-icon danger"><AlertTriangle size={20} /></span>
        <h2>"{clienteNome}" possui {casosAtivos} caso{casosAtivos !== 1 ? 's' : ''} ativo{casosAtivos !== 1 ? 's' : ''}</h2>
        <p>Para excluir este cliente, transfira os casos ativos para outro cliente ou exclua tudo junto.</p>

        {modo === 'escolha' ? (
          <div className="resolver-cliente-opcoes">
            <button className="resolver-cliente-opcao" onClick={() => setModo('transferir')}>
              <ArrowRightLeft size={16} />
              <div>
                <strong>Transferir casos</strong>
                <span>Move os casos para outro cliente e exclui este.</span>
              </div>
            </button>
            <button className="resolver-cliente-opcao danger" onClick={onExcluirMesmoAssim} disabled={excluindo}>
              <Trash2 size={16} />
              <div>
                <strong>{excluindo ? 'Excluindo...' : 'Excluir mesmo assim'}</strong>
                <span>Apaga o cliente e todos os seus casos, documentos e peças.</span>
              </div>
            </button>
          </div>
        ) : (
          <div className="resolver-cliente-transferir">
            <span className="resolver-cliente-transferir-label">Transferir casos para</span>
            <ClienteCombobox
              clientes={clientesDisponiveis}
              value={destinoId}
              onChange={setDestinoId}
              placeholder="Buscar cliente por nome..."
            />
          </div>
        )}

        <div className="confirm-dialog-actions">
          <Button
            variant="secondary"
            onClick={modo === 'transferir' ? () => setModo('escolha') : fechar}
            disabled={transferindo || excluindo}
          >
            {modo === 'transferir' ? 'Voltar' : 'Cancelar'}
          </Button>
          {modo === 'transferir' && (
            <Button onClick={() => destinoId && onTransferir(destinoId)} disabled={!destinoId || transferindo}>
              {transferindo ? 'Transferindo...' : 'Confirmar Transferência'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
