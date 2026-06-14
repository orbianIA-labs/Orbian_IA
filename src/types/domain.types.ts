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

export type CaseStatus = 'active' | 'waiting' | 'done'

export type LegalCase = {
  id: string
  title: string
  caseNumber?: string
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
}
