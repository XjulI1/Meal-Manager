import { z } from 'zod'

export const GenerateShoppingListSchema = z.object({
  menuId: z.string().uuid(),
})
export type GenerateShoppingListDto = z.infer<typeof GenerateShoppingListSchema>

export const ToggleShoppingListItemSchema = z.object({
  isChecked: z.boolean(),
})
export type ToggleShoppingListItemDto = z.infer<typeof ToggleShoppingListItemSchema>

export const ShoppingListItemViewSchema = z.object({
  id: z.string().uuid(),
  ingredientName: z.string(),
  quantity: z.object({ value: z.number().int().nonnegative(), unit: z.string() }),
  isChecked: z.boolean(),
})

export const ShoppingListViewSchema = z.object({
  id: z.string().uuid(),
  menuId: z.string().uuid(),
  generatedAt: z.string().datetime(),
  items: z.array(ShoppingListItemViewSchema),
})
export type ShoppingListView = z.infer<typeof ShoppingListViewSchema>
