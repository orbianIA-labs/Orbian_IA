import { useEffect, useState } from 'react'

type CurrencyInputProps = {
  value: number | undefined
  onChange: (value: number | undefined) => void
  placeholder?: string
  id?: string
}

function centavosParaTexto(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Input de moeda BR: dígitos entram pela direita (tipo caixa eletrônico),
 *  formatando "R$ 1.234,56" automaticamente enquanto digita. */
export function CurrencyInput({ value, onChange, placeholder, id }: CurrencyInputProps) {
  const [texto, setTexto] = useState(value ? centavosParaTexto(Math.round(value * 100)) : '')

  useEffect(() => {
    const valorAtualDoTexto = texto ? Number(texto.replace(/\./g, '').replace(',', '.')) : undefined
    if (value !== valorAtualDoTexto) {
      setTexto(value ? centavosParaTexto(Math.round(value * 100)) : '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function handleChange(raw: string) {
    const digitos = raw.replace(/\D/g, '')
    if (!digitos) {
      setTexto('')
      onChange(undefined)
      return
    }
    const centavos = parseInt(digitos, 10)
    setTexto(centavosParaTexto(centavos))
    onChange(centavos / 100)
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      value={texto}
      placeholder={placeholder ?? 'R$ 0,00'}
      onChange={(e) => handleChange(e.target.value)}
    />
  )
}
