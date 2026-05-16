import { z } from 'zod'
import { IngredientCategorySchema } from './ingredient'
import { QuantityInputSchema } from './units'

export const StorageLocationSchema = z.enum(['pantry', 'fridge', 'freezer'])
export type StorageLocation = z.infer<typeof StorageLocationSchema>

export const CreateInventoryItemSchema = z.object({
  ingredientId: z.string().uuid(),
  quantity: QuantityInputSchema,
  /** Optional; defaults to ingredient.storage when omitted. */
  location: StorageLocationSchema.optional(),
})
export type CreateInventoryItemDto = z.infer<typeof CreateInventoryItemSchema>

export const UpdateInventoryItemSchema = z.object({
  quantity: QuantityInputSchema.optional(),
  location: StorageLocationSchema.optional(),
})
export type UpdateInventoryItemDto = z.infer<typeof UpdateInventoryItemSchema>

export const ListInventoryQuerySchema = z.object({
  location: StorageLocationSchema.optional(),
})
export type ListInventoryQueryDto = z.infer<typeof ListInventoryQuerySchema>

export const InventoryItemViewSchema = z.object({
  id: z.string().uuid(),
  ingredientId: z.string().uuid(),
  /** Resolved from the referenced ingredient at read time. */
  name: z.string(),
  /** Resolved from the referenced ingredient at read time. */
  category: IngredientCategorySchema,
  quantity: z.object({ value: z.number().int().nonnegative(), unit: z.string() }),
  location: StorageLocationSchema,
  updatedAt: z.string().datetime(),
})
export type InventoryItemView = z.infer<typeof InventoryItemViewSchema>
