import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Search, Trash2, User, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ResolverClienteComCasosDialog } from '@/components/ui/ResolverClienteComCasosDialog'
import { clientesService } from '@/services/clientes.service'
import { formatDate } from '@/lib/utils'
import { toast } from '@/store/toastStore'

export function ClientesPage() {
  const [search, setSearch] = useState('')
  const [alvoExclusao, setAlvoExclusao] = useState<{ id: string; nome: string } | null>(null)
  const [conflito, setConflito] = useState<{ id: string; nome: string; casosAtivos: number } | null>(null)
  const queryClient = useQueryClient()
  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes', search],
    queryFn: () => clientesService.list(search || undefined),
  })

  const excluirCliente = useMutation({
    mutationFn: ({ id, forcar }: { id: string; nome: string; forcar?: boolean }) => clientesService.remove(id, { forcar }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      toast('Cliente excluído.', 'success')
      setAlvoExclusao(null)
      setConflito(null)
    },
    onError: (err: unknown, variables) => {
      const resp = (err as { response?: { status?: number; data?: { error?: string; casosAtivos?: number } } })?.response
      if (resp?.status === 409 && typeof resp.data?.casosAtivos === 'number') {
        setAlvoExclusao(null)
        setConflito({ id: variables.id, nome: variables.nome, casosAtivos: resp.data.casosAtivos })
        return
      }
      toast(resp?.data?.error ?? 'Não foi possível excluir o cliente.', 'error')
      setAlvoExclusao(null)
    },
  })

  const transferirEExcluir = useMutation({
    mutationFn: async (destinoId: string) => {
      if (!conflito) return
      await clientesService.transferirCasos(conflito.id, destinoId)
      await clientesService.remove(conflito.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      toast('Casos transferidos e cliente excluído.', 'success')
      setConflito(null)
    },
    onError: () => toast('Não foi possível transferir os casos.', 'error'),
  })

  return (
    <div className="cases-page">
      <div className="cases-page-header">
        <div>
          <h1>Clientes</h1>
          <p>{clientes.length} cliente{clientes.length !== 1 ? 's' : ''} · conduzidos pela Orbian</p>
        </div>
        <div className="cases-header-actions">
          <label className="cases-search" style={{ maxWidth: 260 }}>
            <Search size={14} />
            <input
              type="text"
              placeholder="Pesquisar clientes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <Link to="/clientes/new" className="cases-new-btn">
            <Button><User size={15} /> Novo Cliente</Button>
          </Link>
        </div>
      </div>

      <div className="cases-grid">
        {isLoading && <p className="cases-grid-loading">Carregando...</p>}
        {!isLoading && clientes.length === 0 && (
          <div className="panel-empty">
            <Users size={26} />
            <span>Nenhum cliente cadastrado ainda.</span>
          </div>
        )}
        {clientes.map((c) => (
          <div key={c.id} className="case-tile" style={{ position: 'relative' }}>
            <button
              className="icon-btn danger"
              title="Excluir cliente"
              style={{ position: 'absolute', top: 12, right: 12, zIndex: 1 }}
              disabled={excluirCliente.isPending}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAlvoExclusao({ id: c.id, nome: c.nome }) }}
            >
              <Trash2 size={14} />
            </button>

            <Link to={`/clientes/${c.id}`} className="case-tile-link">
              <div className="case-tile-top">
                <div className="case-tile-name">
                  <User size={14} />
                  <h3>{c.nome}</h3>
                </div>
              </div>

              <p className="case-tile-number">{c.cpfCnpj ?? 'CPF/CNPJ não informado'}</p>
              <p className="case-tile-area">{c.telefone ?? c.email ?? 'Sem contato cadastrado'}</p>

              <div className="case-tile-divider" />

              <div className="case-tile-bottom">
                <span className="case-tile-time">
                  Cliente desde {formatDate(c.createdAt)}
                  <ChevronRight size={14} />
                </span>
              </div>
            </Link>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!alvoExclusao}
        title={`Excluir "${alvoExclusao?.nome}"?`}
        description="Essa ação não pode ser desfeita. Se o cliente tiver casos ativos, você poderá transferi-los ou excluir tudo junto."
        confirmLabel="Excluir"
        danger
        loading={excluirCliente.isPending}
        onConfirm={() => alvoExclusao && excluirCliente.mutate({ id: alvoExclusao.id, nome: alvoExclusao.nome })}
        onCancel={() => setAlvoExclusao(null)}
      />

      <ResolverClienteComCasosDialog
        open={!!conflito}
        clienteNome={conflito?.nome ?? ''}
        casosAtivos={conflito?.casosAtivos ?? 0}
        clientesDisponiveis={clientes.filter((c) => c.id !== conflito?.id)}
        transferindo={transferirEExcluir.isPending}
        excluindo={excluirCliente.isPending}
        onCancel={() => setConflito(null)}
        onTransferir={(destinoId) => transferirEExcluir.mutate(destinoId)}
        onExcluirMesmoAssim={() => conflito && excluirCliente.mutate({ id: conflito.id, nome: conflito.nome, forcar: true })}
      />
    </div>
  )
}
