export type LegalArea =
  | 'civil'
  | 'trabalhista'
  | 'tributario'
  | 'penal'
  | 'familia'
  | 'consumidor'

export type User = {
  id: string
  name: string
  email: string
  plan: 'free' | 'solo' | 'pro'
}

// Status alinhados ao backend (PRD)
export type CaseStatus =
  | 'em_andamento'
  | 'aguardando_documentos'
  | 'aguardando_prazo'
  | 'finalizado'
  | 'arquivado'

export type LegalCase = {
  id: string
  title: string
  caseNumber?: string
  tribunal: string
  clientName: string
  clientPhone: string
  clientEmail: string
  clientCpf: string
  area: LegalArea
  category: string
  flow: string
  status: CaseStatus
  progress: number
  nextAction: string
  nextDeadline?: string
  claimValue: number
  fees: number
  received: number
  pending: number
  expectedProfit: number
  recommendedDocuments: Array<{ name: string; received: boolean }>
  updatedAt: string
}

export type DeadlinePriority = 'critical' | 'attention' | 'normal'

export type Deadline = {
  id: string
  caseId: string
  caseTitle: string
  title: string
  dueDate: string
  businessDaysLeft: number
  priority: DeadlinePriority
  completed: boolean
  responsavel: string
  observacoes: string
}

export type Movimentacao = {
  id: string
  caseId: string
  date: string
  description: string
  source: string
}

export type MovimentacaoRecente = {
  id: string
  caseId: string
  clientName: string
  caseNumber?: string
  date: string
  description: string
}
