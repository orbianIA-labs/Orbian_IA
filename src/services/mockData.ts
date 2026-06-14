import type {
  ClientMessage,
  Deadline,
  DocumentTemplate,
  LegalCase,
  LegalDocument,
  User,
} from '@/types/domain.types'

export const demoUser: User = {
  id: 'usr_demo',
  name: 'Dra. Marina Costa',
  email: 'marina@lexio.demo',
  plan: 'solo',
}

export const cases: LegalCase[] = [
  {
    id: 'case_001',
    title: 'Indenizacao por falha na prestacao de servico',
    caseNumber: '1000928-22.2026.8.26.0100',
    clientName: 'Renata Alves',
    area: 'consumidor',
    status: 'active',
    nextDeadline: '2026-06-14',
    updatedAt: '2026-06-09',
  },
  {
    id: 'case_002',
    title: 'Reclamacao trabalhista por verbas rescisorias',
    caseNumber: '0001842-15.2026.5.02.0031',
    clientName: 'Paulo Mendes',
    area: 'trabalhista',
    status: 'waiting',
    nextDeadline: '2026-06-17',
    updatedAt: '2026-06-08',
  },
  {
    id: 'case_003',
    title: 'Acao de cobranca condominial',
    clientName: 'Condominio Jardim Sul',
    area: 'civil',
    status: 'active',
    nextDeadline: '2026-06-21',
    updatedAt: '2026-06-07',
  },
]

export const deadlines: Deadline[] = [
  {
    id: 'dl_001',
    caseId: 'case_001',
    caseTitle: cases[0].title,
    title: 'Protocolar emenda da inicial',
    dueDate: '2026-06-14',
    businessDaysLeft: 2,
    priority: 'critical',
    completed: false,
  },
  {
    id: 'dl_002',
    caseId: 'case_002',
    caseTitle: cases[1].title,
    title: 'Enviar documentos complementares',
    dueDate: '2026-06-17',
    businessDaysLeft: 5,
    priority: 'attention',
    completed: false,
  },
  {
    id: 'dl_003',
    caseId: 'case_003',
    caseTitle: cases[2].title,
    title: 'Conferir calculo atualizado',
    dueDate: '2026-06-21',
    businessDaysLeft: 8,
    priority: 'normal',
    completed: false,
  },
]

export const templates: DocumentTemplate[] = [
  {
    id: 'tpl_001',
    area: 'consumidor',
    category: 'peticao-inicial',
    title: 'Peticao inicial - falha na prestacao de servico',
    estimatedMinutes: 20,
    variables: ['cliente', 'fornecedor', 'fatos', 'danos', 'pedidos'],
  },
  {
    id: 'tpl_002',
    area: 'trabalhista',
    category: 'contestacao',
    title: 'Contestacao - verbas rescisorias',
    estimatedMinutes: 25,
    variables: ['reclamante', 'empresa', 'contrato', 'jornada', 'pagamentos'],
  },
  {
    id: 'tpl_003',
    area: 'civil',
    category: 'recurso',
    title: 'Agravo de instrumento - tutela de urgencia',
    estimatedMinutes: 30,
    variables: ['agravante', 'decisao', 'risco', 'pedido'],
  },
]

export const documents: LegalDocument[] = [
  {
    id: 'doc_001',
    title: 'Inicial - Renata Alves',
    caseTitle: cases[0].title,
    templateTitle: templates[0].title,
    status: 'draft',
    updatedAt: '2026-06-09',
    wordCount: 1280,
  },
  {
    id: 'doc_002',
    title: 'Contestacao - Paulo Mendes',
    caseTitle: cases[1].title,
    templateTitle: templates[1].title,
    status: 'ready',
    updatedAt: '2026-06-08',
    wordCount: 2140,
  },
]

export const clientMessages: ClientMessage[] = [
  {
    id: 'msg_001',
    clientName: 'Renata Alves',
    caseTitle: cases[0].title,
    tone: 'whatsapp',
    message:
      'Oi, Renata. Atualizacao do seu caso: estamos ajustando a peticao inicial com os documentos enviados. O proximo prazo vence em 14/06/2026 e eu te aviso assim que o protocolo for feito.',
  },
  {
    id: 'msg_002',
    clientName: 'Paulo Mendes',
    caseTitle: cases[1].title,
    tone: 'simples',
    message:
      'Seu processo trabalhista esta na fase de complementacao de documentos. Precisamos revisar os comprovantes antes do envio ao tribunal.',
  },
]
