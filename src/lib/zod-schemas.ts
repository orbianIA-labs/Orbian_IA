import { z } from 'zod'

// Campo monetário opcional. O input converte vazio → undefined via setValueAs (ver NewCasePage).
const optionalMoney = z.number().min(0, 'Não pode ser negativo').optional()

export const createCaseSchema = z.object({
  // Dados do processo
  caseNumber: z
    .string()
    .regex(/^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/, 'Formato CNJ inválido')
    .optional()
    .or(z.literal('')),
  tipoServico: z.string().optional(),
  area: z.enum(['civil', 'trabalhista', 'tributario', 'penal', 'familia', 'consumidor', 'empresarial', 'criminal']),
  tribunal: z.string().optional(),
  instancia: z.string().optional(),
  vara: z.string().optional(),
  comarca: z.string().optional(),
  uf: z.string().optional(),
  prioridade: z.enum(['alta', 'media', 'baixa']).optional(),
  statusInicial: z.string().optional(),
  situacao: z.enum(['a_receber', 'recebido', 'parcial']).optional(),
  dataPrevista: z.string().optional(),

  // Cliente (autor)
  clientName: z.string().min(2, 'Informe o nome do cliente'),
  clientCpf: z.string().optional(),
  clientEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  clientPhone: z.string().optional(),

  // Parte contrária (réu)
  reuNome: z.string().optional(),
  reuCpfCnpj: z.string().optional(),
  reuAdvogado: z.string().optional(),

  // Narrativa
  resumoFatos: z.string().optional(),
  pedidosProvidencias: z.string().optional(),

  // Financeiro
  valorCausa: optionalMoney,
  honorarios: optionalMoney,
  valorRecebido: optionalMoney,

  flow: z.string().optional(),
})

export type CreateCaseInput = z.infer<typeof createCaseSchema>
