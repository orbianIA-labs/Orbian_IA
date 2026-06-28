import { z } from 'zod'

export const createCaseSchema = z.object({
  clientName: z.string().min(2, 'Informe o nome do cliente'),
  clientPhone: z.string().optional(),
  clientEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  clientCpf: z.string().optional(),
  title: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(200, 'Máximo 200 caracteres'),
  caseNumber: z
    .string()
    .regex(/^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/, 'Formato CNJ inválido')
    .optional()
    .or(z.literal('')),
  tribunal: z.string().optional(),
  area: z.enum(['civil', 'trabalhista', 'tributario', 'penal', 'familia', 'consumidor']),
  flow: z.string().optional(),
})

export type CreateCaseInput = z.infer<typeof createCaseSchema>
