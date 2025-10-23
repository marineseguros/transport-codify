import { z } from 'zod';

// Authentication schemas
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: 'Email inválido' })
    .max(255, { message: 'Email deve ter no máximo 255 caracteres' }),
  password: z
    .string()
    .min(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
    .max(100, { message: 'Senha deve ter no máximo 100 caracteres' }),
});

export const signUpSchema = loginSchema.extend({
  nome: z
    .string()
    .trim()
    .min(2, { message: 'Nome deve ter no mínimo 2 caracteres' })
    .max(100, { message: 'Nome deve ter no máximo 100 caracteres' }),
});

// Cliente validation schema
export const clienteSchema = z.object({
  segurado: z
    .string()
    .trim()
    .min(2, { message: 'Nome deve ter no mínimo 2 caracteres' })
    .max(200, { message: 'Nome deve ter no máximo 200 caracteres' }),
  cpf_cnpj: z
    .string()
    .trim()
    .refine(
      (val) => {
        const numbers = val.replace(/\D/g, '');
        return numbers.length === 11 || numbers.length === 14;
      },
      { message: 'CPF/CNPJ inválido' }
    ),
  email: z
    .string()
    .trim()
    .email({ message: 'Email inválido' })
    .max(255, { message: 'Email deve ter no máximo 255 caracteres' })
    .optional()
    .or(z.literal('')),
  telefone: z
    .string()
    .trim()
    .max(20, { message: 'Telefone deve ter no máximo 20 caracteres' })
    .optional()
    .or(z.literal('')),
  cidade: z
    .string()
    .trim()
    .max(100, { message: 'Cidade deve ter no máximo 100 caracteres' })
    .optional()
    .or(z.literal('')),
  uf: z
    .string()
    .length(2, { message: 'UF deve ter 2 caracteres' })
    .optional()
    .or(z.literal('')),
  observacoes: z
    .string()
    .trim()
    .max(1000, { message: 'Observações devem ter no máximo 1000 caracteres' })
    .optional()
    .or(z.literal('')),
  captacao_id: z
    .string()
    .uuid({ message: 'ID de captação inválido' })
    .optional()
    .or(z.literal('')),
});

// Cotação validation schema
export const cotacaoSchema = z.object({
  segurado: z
    .string()
    .trim()
    .min(2, { message: 'Nome do segurado é obrigatório' })
    .max(200, { message: 'Nome deve ter no máximo 200 caracteres' }),
  cpf_cnpj: z
    .string()
    .trim()
    .refine(
      (val) => {
        const numbers = val.replace(/\D/g, '');
        return numbers.length === 11 || numbers.length === 14;
      },
      { message: 'CPF/CNPJ inválido' }
    ),
  valor_premio: z
    .number()
    .min(0, { message: 'Valor do prêmio deve ser maior ou igual a zero' })
    .optional(),
  num_proposta: z
    .string()
    .trim()
    .max(50, { message: 'Número da proposta deve ter no máximo 50 caracteres' })
    .optional()
    .or(z.literal('')),
  observacoes: z
    .string()
    .trim()
    .max(1000, { message: 'Observações devem ter no máximo 1000 caracteres' })
    .optional()
    .or(z.literal('')),
  comentarios: z
    .string()
    .trim()
    .max(1000, { message: 'Comentários devem ter no máximo 1000 caracteres' })
    .optional()
    .or(z.literal('')),
  motivo_recusa: z
    .string()
    .trim()
    .max(500, { message: 'Motivo da recusa deve ter no máximo 500 caracteres' })
    .optional()
    .or(z.literal('')),
});

// CSV import validation
export const csvRowSchema = z.object({
  Segurado: z
    .string()
    .trim()
    .min(2, { message: 'Segurado deve ter no mínimo 2 caracteres' })
    .max(200, { message: 'Segurado deve ter no máximo 200 caracteres' }),
  CNPJ: z
    .string()
    .trim()
    .refine(
      (val) => {
        const numbers = val.replace(/\D/g, '');
        return numbers.length === 11 || numbers.length === 14;
      },
      { message: 'CPF/CNPJ inválido' }
    ),
  Tipo: z
    .string()
    .trim()
    .max(100, { message: 'Tipo deve ter no máximo 100 caracteres' })
    .optional()
    .or(z.literal('')),
  'Data Cotação': z.string().optional().or(z.literal('')),
  'Data Fechamento': z.string().optional().or(z.literal('')),
  'Início Vigência': z.string().optional().or(z.literal('')),
  'Fim Vigência': z.string().optional().or(z.literal('')),
  'Valor Prêmio': z.string().optional().or(z.literal('')),
  Status: z.string().optional().or(z.literal('')),
  Observações: z
    .string()
    .trim()
    .max(1000, { message: 'Observações devem ter no máximo 1000 caracteres' })
    .optional()
    .or(z.literal('')),
  'Número Apólice': z
    .string()
    .trim()
    .max(50, { message: 'Número da apólice deve ter no máximo 50 caracteres' })
    .optional()
    .or(z.literal('')),
  'Motivo Recusa': z
    .string()
    .trim()
    .max(500, { message: 'Motivo da recusa deve ter no máximo 500 caracteres' })
    .optional()
    .or(z.literal('')),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ClienteInput = z.infer<typeof clienteSchema>;
export type CotacaoInput = z.infer<typeof cotacaoSchema>;
export type CSVRowInput = z.infer<typeof csvRowSchema>;
