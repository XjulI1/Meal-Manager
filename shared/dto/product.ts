import { z } from 'zod'
import { CanonicalUnitSchema, IngredientViewSchema } from './ingredient'

/** Raw barcode as submitted by the user (8/12/13 digits). Server normalizes/validates. */
const BarcodeStringSchema = z
  .string()
  .min(8)
  .max(14)
  .trim()
  .regex(/^\d+$/, 'Barcode must contain only digits')

export const CreateProductSchema = z.object({
  brand: z.string().min(1).max(100).trim().optional(),
  packSize: z.number().int().positive(),
  packUnit: CanonicalUnitSchema,
  imageUrl: z.string().url().max(500).optional(),
  barcodes: z.array(BarcodeStringSchema).min(1).max(10),
})
export type CreateProductDto = z.infer<typeof CreateProductSchema>

export const UpdateProductSchema = z.object({
  brand: z.string().min(1).max(100).trim().nullable().optional(),
  packSize: z.number().int().positive().optional(),
  imageUrl: z.string().url().max(500).nullable().optional(),
  barcodes: z.array(BarcodeStringSchema).min(1).max(10).optional(),
})
export type UpdateProductDto = z.infer<typeof UpdateProductSchema>

export const ProductViewSchema = z.object({
  id: z.string().uuid(),
  ingredientId: z.string().uuid(),
  brand: z.string().nullable(),
  packSize: z.number().int().positive(),
  packUnit: CanonicalUnitSchema,
  imageUrl: z.string().nullable(),
  barcodes: z.array(z.string()),
  updatedAt: z.string().datetime(),
})
export type ProductView = z.infer<typeof ProductViewSchema>

/** Response of GET /api/barcodes/:code */
export const BarcodeResolutionViewSchema = z.object({
  ingredient: IngredientViewSchema,
  product: ProductViewSchema,
})
export type BarcodeResolutionView = z.infer<typeof BarcodeResolutionViewSchema>
