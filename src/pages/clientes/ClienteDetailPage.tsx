import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Sparkles, Trash2, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ResolverClienteComCasosDialog } from '@/components/ui/ResolverClienteComCasosDialog'
import { clientesService } from '@/services/clientes.service'
import { casesService } from '@/services/cases.service'
import { prazosService } from '@/services/prazos.service'
import { PIPELINE } from '@/lib/pipeline'
import { caseStatusLabel, formatDate, relativeTime } from '@/lib/utils'
import { isValidCpfCnpj, isValidEmail, isValidTelefone } from '@/lib/validators'
import { toast } from '@/store/toastStore'
import type { CaseStatus } from '@/types/domain.types'

const STATUS_BADGE_CLASS: Record<CaseStatus, string> = {
  em_andamento: 'badge-success',
  aguardando_documentos: 'badge-warning',
  aguardando_prazo: 'badge-warning',
  finalizado: 'badge-info',
  arquivado: 'badge-normal',
}

function faseLabel(etapaAtual: string) {
  return PIPELINE.find((s) => s.key === etapaAtual)?.label ?? etapaAtual
}

export function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente', id],
    queryFn: () => clientesService.get(id!),
    enabled: !!id,
  })

  const { data: casos = [] } = useQuery({
    queryKey: ['cases', { clienteId: id }],
    queryFn: () => casesService.list({ clienteId: id }),
    enabled: !!id,
  })

  const prazosPorCaso = useQueries({
    queries: casos.map((c) => ({
      queryKey: ['prazos', c.id],
      queryFn: () => prazosService.list(c.id),
      enabled: !!c.id,
    })),
  })
  const todosPrazos = prazosPorCaso.flatMap((q) => q.data ?? [])

  const [editando, setEditando] = useState(false)
  const [editForm, setEditForm] = useState({ nome: '', cpfCnpj: '', telefone: '', email: '' })
  const [editErros, setEditErros] = useState<{ cpfCnpj?: string; telefone?: string; email?: string }>({})

  const salvarEdicao = useMutation({
    mutationFn: () => clientesService.update(id!, {
      nome: editForm.nome,
      cpfCnpj: editForm.cpfCnpj || null,
      telefone: editForm.telefone || null,
      email: editForm.email || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cliente', id] }); setEditando(false); toast('Cliente atualizado.', 'success') },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast(msg ?? 'Não foi possível salvar as alterações.', 'error')
    },
  })

  function abrirEdicao() {
    if (!cliente) return
    setEditForm({ nome: cliente.nome, cpfCnpj: cliente.cpfCnpj ?? '', telefone: cliente.telefone ?? '', email: cliente.email ?? '' })
    setEditErros({})
    setEditando(true)
  }

  function validarEdicao(): boolean {
    const novosErros: typeof editErros = {}
    if (editForm.cpfCnpj.trim() && !isValidCpfCnpj(editForm.cpfCnpj)) novosErros.cpfCnpj = 'CPF/CNPJ inválido.'
    if (editForm.telefone.trim() && !isValidTelefone(editForm.telefone)) novosErros.telefone = 'Telefone inválido.'
    if (editForm.email.trim() && !isValidEmail(editForm.email)) novosErros.email = 'E-mail inválido.'
    setEditErros(novosErros)
    return Object.keys(novosErros).length === 0
  }

  function handleSalvarEdicao() {
    if (!validarEdicao()) return
    salvarEdicao.mutate()
  }

  const [alvoExclusao, setAlvoExclusao] = useState(false)
  const [conflito, setConflito] = useState<{ casosAtivos: number } | null>(null)
  const { data: clientesDisponiveis = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => clientesService.list(),
    enabled: !!conflito,
  })

  const excluirCliente = useMutation({
    mutationFn: (forcar?: boolean) => clientesService.remove(id!, { forcar }),
    onSuccess: () => {
      toast('Cliente excluído.', 'success')
      navigate('/clientes')
    },
    onError: (err: unknown) => {
      const resp = (err as { response?: { status?: number; data?: { error?: string; casosAtivos?: number } } })?.response
      if (resp?.status === 409 && typeof resp.data?.casosAtivos === 'number') {
        setAlvoExclusao(false)
        setConflito({ casosAtivos: resp.data.casosAtivos })
        return
      }
      toast(resp?.data?.error ?? 'Não foi possível excluir o cliente.', 'error')
      setAlvoExclusao(false)
    },
  })

  const transferirEExcluir = useMutation({
    mutationFn: async (destinoId: string) => {
      await clientesService.transferirCasos(id!, destinoId)
      await clientesService.remove(id!)
    },
    onSuccess: () => {
      toast('Casos transferidos e cliente excluído.', 'success')
      navigate('/clientes')
    },
    onError: () => toast('Não foi possível transferir os casos.', 'error'),
  })

  if (isLoading) return <div className="screen-loader">Carregando cliente...</div>
  if (!cliente) return <div className="page-stack"><p>Cliente não encontrado.</p></div>

  const prazosUrgentes = todosPrazos.filter((p) => !p.concluido && (p.status === 'urgente' || p.status === 'atencao'))
  const casosSemPeca = casos.filter((c) => c.etapaAtual === 'cadastro' || c.etapaAtual === 'documentos')
  const recomendacoes: string[] = []
  if (prazosUrgentes.length > 0) recomendacoes.push(`${prazosUrgentes.length} prazo(s) com vencimento próximo precisam de atenção.`)
  if (casosSemPeca.length > 0) recomendacoes.push(`${casosSemPeca.length} caso(s) aguardando geração de peça.`)

  return (
    <div className="cliente-detail-page">
      <div className="case-breadcrumb" style={{ marginBottom: 12 }}>
        <Link to="/clientes">Clientes</Link>
        <span>›</span>
        <strong>{cliente.nome}</strong>
      </div>

      <div className="panel cliente-detail-header">
        <span className="cliente-avatar">{cliente.nome.slice(0, 2).toUpperCase()}</span>
        <div>
          <h1>{cliente.nome}</h1>
          <p className="cliente-detail-sub">
            {cliente.cpfCnpj ? (cliente.cpfCnpj.replace(/\D/g, '').length > 11 ? 'Pessoa Jurídica' : 'Pessoa Física') : 'Cliente'}
            {' · cliente desde '}{formatDate(cliente.createdAt)}
            {' · '}<span className="badge badge-success">Ativo</span>
          </p>
        </div>
      </div>

      {/* Ações ficam no topo: com muitos casos a lista rola e uma barra no rodapé sumiria. */}
      <div className="cliente-detail-actionbar">
        <Button onClick={() => navigate(`/cases/new?clienteId=${id}&clienteNome=${encodeURIComponent(cliente.nome)}`)}>
          <Plus size={14} /> Novo Caso
        </Button>
        <Button variant="secondary" onClick={abrirEdicao}>Editar Cliente</Button>
        <Button variant="danger" onClick={() => setAlvoExclusao(true)}><Trash2 size={14} /> Excluir Cliente</Button>
      </div>

      {editando && (
        <div className="panel" style={{ marginBottom: 4 }}>
          <p className="section-label" style={{ marginBottom: 12 }}>EDITAR CLIENTE</p>
          <label className="nc-field">Nome<input value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} /></label>
          <div className="nc-field-pair">
            <label className="nc-field">
              CPF/CNPJ
              <input value={editForm.cpfCnpj} onChange={(e) => { setEditForm({ ...editForm, cpfCnpj: e.target.value }); setEditErros((p) => ({ ...p, cpfCnpj: undefined })) }} />
              {editErros.cpfCnpj && <small>{editErros.cpfCnpj}</small>}
            </label>
            <label className="nc-field">
              Telefone
              <input value={editForm.telefone} onChange={(e) => { setEditForm({ ...editForm, telefone: e.target.value }); setEditErros((p) => ({ ...p, telefone: undefined })) }} />
              {editErros.telefone && <small>{editErros.telefone}</small>}
            </label>
          </div>
          <label className="nc-field">
            E-mail
            <input type="email" value={editForm.email} onChange={(e) => { setEditForm({ ...editForm, email: e.target.value }); setEditErros((p) => ({ ...p, email: undefined })) }} />
            {editErros.email && <small>{editErros.email}</small>}
          </label>
          <div className="button-row" style={{ marginTop: 12 }}>
            <Button onClick={handleSalvarEdicao} disabled={!editForm.nome.trim() || salvarEdicao.isPending}>
              {salvarEdicao.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button variant="secondary" onClick={() => setEditando(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      <div className="cliente-detail-body">
        <div className="cliente-casos-col">
          {casos.length === 0 ? (
            <div className="panel-empty">
              <User size={26} />
              <span>Nenhum caso cadastrado para este cliente ainda.</span>
              <Button onClick={() => navigate(`/cases/new?clienteId=${id}&clienteNome=${encodeURIComponent(cliente.nome)}`)}>
                <Plus size={14} /> Novo Caso
              </Button>
            </div>
          ) : casos.map((c) => {
            const prazoDoCaso = (prazosPorCaso.find((_, i) => casos[i]?.id === c.id)?.data ?? [])
              .filter((p) => !p.concluido)
              .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime())[0]
            return (
              <div key={c.id} className="panel cliente-caso-card">
                <div className="cliente-caso-head">
                  <strong>{c.title || c.category || 'Caso'}</strong>
                  <span className={`badge ${STATUS_BADGE_CLASS[c.status]}`}>{caseStatusLabel(c.status)}</span>
                </div>
                <div className="cliente-caso-row">
                  <div><span>Fase</span><strong>{faseLabel(c.etapaAtual)}</strong></div>
                  <div><span>Prazo</span><strong>{prazoDoCaso ? formatDate(prazoDoCaso.dataVencimento) : '—'}</strong></div>
                  <div><span>Atualização</span><strong>{formatDate(c.updatedAt)}</strong></div>
                  <Button variant="secondary" onClick={() => navigate(`/cases/${c.id}`)}>Continuar</Button>
                </div>
              </div>
            )
          })}
        </div>

        <aside className="cliente-side-col">
          <div className="panel">
            <p className="section-label" style={{ marginBottom: 12 }}>IA RECOMENDA</p>
            {recomendacoes.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>Nenhuma recomendação no momento.</p>
            ) : (
              <ul className="cliente-recomendacoes-list">
                {recomendacoes.map((r, i) => (
                  <li key={i}><Sparkles size={13} /> {r}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="panel">
            <p className="section-label" style={{ marginBottom: 12 }}>ATIVIDADE RECENTE</p>
            {casos.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>Nenhuma atividade ainda.</p>
            ) : (
              <ul className="case-activity-list">
                {[...casos].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5).map((c) => (
                  <li key={c.id}>
                    <span className="case-activity-dot" />
                    <div>
                      <strong>{c.title || c.category} atualizado</strong>
                      <span>{relativeTime(c.updatedAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={alvoExclusao}
        title={`Excluir "${cliente.nome}"?`}
        description="Essa ação não pode ser desfeita. Se o cliente tiver casos ativos, você poderá transferi-los ou excluir tudo junto."
        confirmLabel="Excluir"
        danger
        loading={excluirCliente.isPending}
        onConfirm={() => excluirCliente.mutate(undefined)}
        onCancel={() => setAlvoExclusao(false)}
      />

      <ResolverClienteComCasosDialog
        open={!!conflito}
        clienteNome={cliente.nome}
        casosAtivos={conflito?.casosAtivos ?? 0}
        clientesDisponiveis={clientesDisponiveis.filter((c) => c.id !== id)}
        transferindo={transferirEExcluir.isPending}
        excluindo={excluirCliente.isPending}
        onCancel={() => setConflito(null)}
        onTransferir={(destinoId) => transferirEExcluir.mutate(destinoId)}
        onExcluirMesmoAssim={() => excluirCliente.mutate(true)}
      />
    </div>
  )
}
