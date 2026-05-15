import { z } from 'zod'
import { UNITS } from '../units/conversions'

export const UnitSymbolSchema = z
  .string()
  .min(1)
  .max(8)
  .transform((s) => s.trim().toLowerCase())
  .refine((s) => s in UNITS, { message: 'Unknown unit symbol' })

export const QuantityInputSchema = z.object({
  value: z.number().finite().nonnegative(),
  unit: UnitSymbolSchema,
})

export type QuantityInputDto = z.infer<typeof QuantityInputSchema>
