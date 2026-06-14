import { z } from 'zod'

export const createCaseSchema = z.object({
  title: z
    .string()
    .min(3, 'Minimo 3 caracteres')
    .max(200, 'Maximo 200 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ0-9\s\-.]+$/, 'Caracteres invalidos'),
  caseNumber: z
    .string()
    .regex(/^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/, 'Formato CNJ invalido')
    .optional()
    .or(z.literal('')),
  clientName: z.string().min(2, 'Informe o cliente'),
  area: z.enum(['civil', 'trabalhista', 'tributario', 'penal', 'familia', 'consumidor']),
})

export type CreateCaseInput = z.infer<typeof createCaseSchema>
