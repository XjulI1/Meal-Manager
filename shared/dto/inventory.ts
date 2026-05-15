import { z } from 'zod'
import { QuantityInputSchema } from './units'

export const StorageLocationSchema = z.enum(['pantry', 'fridge'])
export type StorageLocation = z.infer<typeof StorageLocationSchema>

export const CreateInventoryItemSchema = z.object({
  name: z.string().min(1).max(120).trim(),
  quantity: QuantityInputSchema,
  location: StorageLocationSchema,
})
export type CreateInventoryItemDto = z.infer<typeof CreateInventoryItemSchema>

export const UpdateInventoryItemSchema = z.object({
  name: z.string().min(1).max(120).trim().optional(),
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
  name: z.string(),
  quantity: z.object({ value: z.number().int().nonnegative(), unit: z.string() }),
  location: StorageLocationSchema,
  updatedAt: z.string().datetime(),
})
export type InventoryItemView = z.infer<typeof InventoryItemViewSchema>
