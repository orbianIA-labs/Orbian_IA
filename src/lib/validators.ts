export function normalizarDigitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

function calcDigitoCpf(nums: number[], count: number): number {
  let soma = 0
  for (let i = 0; i < count; i++) soma += nums[i] * (count + 1 - i)
  const resto = soma % 11
  return resto < 2 ? 0 : 11 - resto
}

export function isValidCpf(valor: string): boolean {
  const d = normalizarDigitos(valor)
  if (d.length !== 11 || new Set(d).size === 1) return false
  const nums = d.split('').map(Number)
  return calcDigitoCpf(nums, 9) === nums[9] && calcDigitoCpf(nums, 10) === nums[10]
}

function calcDigitoCnpj(nums: number[], pesos: number[], count: number): number {
  let soma = 0
  for (let i = 0; i < count; i++) soma += nums[i] * pesos[i]
  const resto = soma % 11
  return resto < 2 ? 0 : 11 - resto
}

export function isValidCnpj(valor: string): boolean {
  const d = normalizarDigitos(valor)
  if (d.length !== 14 || new Set(d).size === 1) return false
  const nums = d.split('').map(Number)
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  return calcDigitoCnpj(nums, pesos1, 12) === nums[12] && calcDigitoCnpj(nums, pesos2, 13) === nums[13]
}

export function isValidCpfCnpj(valor: string): boolean {
  const d = normalizarDigitos(valor)
  if (d.length === 11) return isValidCpf(d)
  if (d.length === 14) return isValidCnpj(d)
  return false
}

export function isValidTelefone(valor: string): boolean {
  const d = normalizarDigitos(valor)
  if (d.length !== 10 && d.length !== 11) return false
  const ddd = Number(d.slice(0, 2))
  return ddd >= 11 && ddd <= 99
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export function isValidEmail(valor: string): boolean {
  return EMAIL_REGEX.test(valor.trim())
}
