import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Sparkles, Upload, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { clientesService } from '@/services/clientes.service'
import { casesService } from '@/services/cases.service'
import { prazosService } from '@/services/prazos.service'
import { PIPELINE } from '@/lib/pipeline'
import { caseStatusLabel, formatDate, relativeTime } from '@/lib/utils'
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

  const salvarEdicao = useMutation({
    mutationFn: () => clientesService.update(id!, {
      nome: editForm.nome,
      cpfCnpj: editForm.cpfCnpj || null,
      telefone: editForm.telefone || null,
      email: editForm.email || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cliente', id] }); setEditando(false); toast('Cliente atualizado.', 'success') },
    onError: () => toast('Não foi possível salvar as alterações.', 'error'),
  })

  function abrirEdicao() {
    if (!cliente) return
    setEditForm({ nome: cliente.nome, cpfCnpj: cliente.cpfCnpj ?? '', telefone: cliente.telefone ?? '', email: cliente.email ?? '' })
    setEditando(true)
  }

  if (isLoading) return <div className="screen-loader">Carregando cliente...</div>
  if (!cliente) return <div className="page-stack"><p>Cliente não encontrado.</p></div>

  const casosAtivos = casos.filter((c) => c.status === 'em_andamento' || c.status === 'aguardando_documentos' || c.status === 'aguardando_prazo')
  const proximoPrazo = todosPrazos
    .filter((p) => !p.concluido)
    .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime())[0]
  const ultimaAtividade = casos
    .map((c) => c.updatedAt)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]

  const prazosUrgentes = todosPrazos.filter((p) => !p.concluido && (p.status === 'urgente' || p.status === 'atencao'))
  const casosSemPeca = casos.filter((c) => c.etapaAtual === 'cadastro' || c.etapaAtual === 'documentos')
  const recomendacoes: string[] = []
  if (prazosUrgentes.length > 0) recomendacoes.push(`${prazosUrgentes.length} prazo(s) com vencimento próximo precisam de atenção.`)
  if (casosSemPeca.length > 0) recomendacoes.push(`${casosSemPeca.length} caso(s) aguardando geração de peça.`)

  function irParaDocumentos() {
    const casoRecente = [...casos].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
    if (!casoRecente) { toast('Cadastre um caso para este cliente primeiro.', 'info'); return }
    navigate(`/cases/${casoRecente.id}/documentos`)
  }

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
        <Button variant="secondary" onClick={abrirEdicao}>Editar</Button>
      </div>

      {editando && (
        <div className="panel" style={{ marginBottom: 4 }}>
          <p className="section-label" style={{ marginBottom: 12 }}>EDITAR CLIENTE</p>
          <label className="nc-field">Nome<input value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} /></label>
          <div className="nc-field-pair">
            <label className="nc-field">CPF/CNPJ<input value={editForm.cpfCnpj} onChange={(e) => setEditForm({ ...editForm, cpfCnpj: e.target.value })} /></label>
            <label className="nc-field">Telefone<input value={editForm.telefone} onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })} /></label>
          </div>
          <label className="nc-field">E-mail<input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></label>
          <div className="button-row" style={{ marginTop: 12 }}>
            <Button onClick={() => salvarEdicao.mutate()} disabled={!editForm.nome.trim() || salvarEdicao.isPending}>
              {salvarEdicao.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button variant="secondary" onClick={() => setEditando(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      <div className="cliente-stats-row">
        <div className="panel cliente-stat-card">
          <span>Casos Ativos</span>
          <strong>{casosAtivos.length}</strong>
        </div>
        <div className="panel cliente-stat-card">
          <span>Próximo Prazo</span>
          <strong>{proximoPrazo ? formatDate(proximoPrazo.dataVencimento) : '—'}</strong>
        </div>
        <div className="panel cliente-stat-card">
          <span>Última Atividade</span>
          <strong>{ultimaAtividade ? relativeTime(ultimaAtividade) : '—'}</strong>
        </div>
        <div className="panel cliente-stat-card">
          <span>IA Recomenda</span>
          <strong>{recomendacoes.length}</strong>
        </div>
      </div>

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

      <div className="cliente-detail-actionbar">
        <Button onClick={() => navigate(`/cases/new?clienteId=${id}&clienteNome=${encodeURIComponent(cliente.nome)}`)}>
          <Plus size={14} /> Novo Caso
        </Button>
        <Button variant="secondary" onClick={irParaDocumentos}><Upload size={14} /> Adicionar Documento</Button>
        <Button variant="secondary" onClick={abrirEdicao}>Editar Cliente</Button>
      </div>
    </div>
  )
}
