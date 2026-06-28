import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function areaLabel(area: string) {
  const labels: Record<string, string> = {
    civil: 'Civel',
    trabalhista: 'Trabalhista',
    tributario: 'Tributario',
    penal: 'Penal',
    familia: 'Familia',
    consumidor: 'Consumidor',
  }

  return labels[area] ?? area
}

export const caseStatusOptions = [
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'aguardando_documentos', label: 'Aguardando documentos' },
  { value: 'aguardando_prazo', label: 'Aguardando prazo' },
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'arquivado', label: 'Arquivado' },
] as const

export function caseStatusLabel(status: string) {
  return caseStatusOptions.find((o) => o.value === status)?.label ?? status
}
