import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { clientesService } from '@/services/clientes.service'
import { isValidCpfCnpj, isValidEmail, isValidTelefone } from '@/lib/validators'
import { toast } from '@/store/toastStore'

type TipoPessoa = 'fisica' | 'juridica'

export function NewClientePage() {
  const navigate = useNavigate()
  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa>('fisica')
  const [nome, setNome] = useState('')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [erros, setErros] = useState<{ cpfCnpj?: string; telefone?: string; email?: string }>({})

  const criar = useMutation({
    mutationFn: () => clientesService.create({
      nome: nome.trim(),
      cpfCnpj: cpfCnpj || null,
      telefone: telefone || null,
      email: email || null,
    }),
    onSuccess: (cliente) => {
      toast('Cliente cadastrado.', 'success')
      navigate(`/clientes/${cliente.id}`)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast(msg ?? 'Não foi possível cadastrar o cliente.', 'error')
    },
  })

  function validar(): boolean {
    const novosErros: typeof erros = {}
    if (cpfCnpj.trim() && !isValidCpfCnpj(cpfCnpj)) {
      novosErros.cpfCnpj = tipoPessoa === 'fisica' ? 'CPF inválido.' : 'CNPJ inválido.'
    }
    if (telefone.trim() && !isValidTelefone(telefone)) {
      novosErros.telefone = 'Telefone inválido.'
    }
    if (email.trim() && !isValidEmail(email)) {
      novosErros.email = 'E-mail inválido.'
    }
    setErros(novosErros)
    return Object.keys(novosErros).length === 0
  }

  function handleCadastrar() {
    if (!validar()) return
    criar.mutate()
  }

  return (
    <div className="new-case-page">
      <header className="new-case-header">
        <button className="back-btn" onClick={() => navigate('/clientes')}>
          <ArrowLeft size={16} /> Voltar
        </button>
        <div>
          <h1>Novo Cliente</h1>
          <p className="new-case-card-sub" style={{ border: 'none', padding: 0 }}>
            Cadastre o cliente antes de criar os casos dele.
          </p>
        </div>
      </header>

      <section className="new-case-card">
        <div className="segmented-control" style={{ marginBottom: 20 }}>
          <button
            type="button"
            className={`segmented-option ${tipoPessoa === 'fisica' ? 'active' : ''}`}
            onClick={() => setTipoPessoa('fisica')}
          >
            Pessoa Física
          </button>
          <button
            type="button"
            className={`segmented-option ${tipoPessoa === 'juridica' ? 'active' : ''}`}
            onClick={() => setTipoPessoa('juridica')}
          >
            Pessoa Jurídica
          </button>
        </div>

        <label className="nc-field">
          {tipoPessoa === 'fisica' ? 'Nome completo' : 'Razão social'}
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: João Carlos Silva" />
        </label>
        <div className="nc-field-pair">
          <label className="nc-field">
            {tipoPessoa === 'fisica' ? 'CPF' : 'CNPJ'}
            <input
              value={cpfCnpj}
              onChange={(e) => { setCpfCnpj(e.target.value); setErros((p) => ({ ...p, cpfCnpj: undefined })) }}
              placeholder={tipoPessoa === 'fisica' ? '000.000.000-00' : '00.000.000/0000-00'}
            />
            {erros.cpfCnpj && <small>{erros.cpfCnpj}</small>}
          </label>
          <label className="nc-field">
            Telefone
            <input
              value={telefone}
              onChange={(e) => { setTelefone(e.target.value); setErros((p) => ({ ...p, telefone: undefined })) }}
              placeholder="(11) 98888-7777"
            />
            {erros.telefone && <small>{erros.telefone}</small>}
          </label>
        </div>
        <label className="nc-field">
          E-mail
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErros((p) => ({ ...p, email: undefined })) }}
          />
          {erros.email && <small>{erros.email}</small>}
        </label>

        <Button onClick={handleCadastrar} disabled={!nome.trim() || criar.isPending} style={{ marginTop: 16 }}>
          {criar.isPending ? 'Cadastrando...' : 'Cadastrar Cliente'}
        </Button>
      </section>
    </div>
  )
}
