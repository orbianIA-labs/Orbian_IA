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
