import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import type { Cliente } from '@/services/clientes.service'

type Props = {
  clientes: Cliente[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
}

export function ClienteCombobox({ clientes, value, onChange, placeholder = 'Buscar cliente...' }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const selecionado = clientes.find((c) => c.id === value)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const filtrados = query.trim()
    ? clientes.filter((c) => c.nome.toLowerCase().includes(query.trim().toLowerCase()))
    : clientes

  return (
    <div className="cliente-combobox" ref={wrapperRef}>
      <div className="cliente-combobox-input">
        <Search size={14} />
        <input
          type="text"
          placeholder={placeholder}
          value={open ? query : (selecionado?.nome ?? '')}
          onFocus={() => { setOpen(true); setQuery('') }}
          onChange={(e) => {
            setQuery(e.target.value)
            if (value) onChange('')
          }}
        />
      </div>
      {open && (
        <ul className="cliente-combobox-list">
          {filtrados.length === 0 && <li className="cliente-combobox-empty">Nenhum cliente encontrado.</li>}
          {filtrados.map((c) => (
            <li
              key={c.id}
              className={c.id === value ? 'active' : ''}
              onClick={() => { onChange(c.id); setQuery(c.nome); setOpen(false) }}
            >
              {c.nome}{c.cpfCnpj ? ` · ${c.cpfCnpj}` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
