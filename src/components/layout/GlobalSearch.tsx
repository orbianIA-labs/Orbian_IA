import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FileText, Search, User } from 'lucide-react'
import { casesService } from '@/services/cases.service'
import { clientesService } from '@/services/clientes.service'

/** Busca global da topbar: procura em Clientes (nome/CPF) e Casos (título, nº do
 *  processo, cliente). */
export function GlobalSearch() {
  const navigate = useNavigate()
  const [termo, setTermo] = useState('')
  const [aberto, setAberto] = useState(false)
  const [debounced, setDebounced] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(termo.trim()), 250)
    return () => clearTimeout(t)
  }, [termo])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const buscando = debounced.length >= 2

  const { data: clientes = [], isFetching: buscandoClientes } = useQuery({
    queryKey: ['busca-clientes', debounced],
    queryFn: () => clientesService.list(debounced),
    enabled: buscando,
  })

  const { data: casos = [], isFetching: buscandoCasos } = useQuery({
    queryKey: ['busca-casos', debounced],
    queryFn: () => casesService.list({ q: debounced }),
    enabled: buscando,
  })

  const carregando = buscandoClientes || buscandoCasos
  const clientesTop = clientes.slice(0, 4)
  const casosTop = casos.slice(0, 4)
  const semResultado = buscando && !carregando && clientesTop.length === 0 && casosTop.length === 0

  function irPara(rota: string) {
    setAberto(false)
    setTermo('')
    navigate(rota)
  }

  return (
    <div className="global-search" ref={wrapperRef}>
      <label className="search-box">
        <Search size={16} />
        <input
          ref={inputRef}
          value={termo}
          placeholder="Pesquisar em toda a operação..."
          onChange={(e) => { setTermo(e.target.value); setAberto(true) }}
          onFocus={() => setAberto(true)}
        />
      </label>

      {aberto && (termo.trim().length > 0) && (
        <div className="global-search-results">
          {!buscando && <p className="global-search-hint">Digite ao menos 2 caracteres.</p>}
          {carregando && buscando && <p className="global-search-hint">Buscando...</p>}
          {semResultado && <p className="global-search-hint">Nenhum resultado para "{debounced}".</p>}

          {clientesTop.length > 0 && (
            <>
              <p className="global-search-group">CLIENTES</p>
              {clientesTop.map((c) => (
                <button key={c.id} className="global-search-item" onClick={() => irPara(`/clientes/${c.id}`)}>
                  <User size={14} />
                  <span className="global-search-item-title">{c.nome}</span>
                  {c.cpfCnpj && <span className="global-search-item-meta">{c.cpfCnpj}</span>}
                </button>
              ))}
            </>
          )}

          {casosTop.length > 0 && (
            <>
              <p className="global-search-group">CASOS</p>
              {casosTop.map((c) => (
                <button key={c.id} className="global-search-item" onClick={() => irPara(`/cases/${c.id}`)}>
                  <FileText size={14} />
                  <span className="global-search-item-title">{c.title || c.clientName}</span>
                  <span className="global-search-item-meta">{c.caseNumber ?? `#${c.protocolo}`}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
