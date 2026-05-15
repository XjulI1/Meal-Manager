import { z } from 'zod'
import { QuantityInputSchema } from './units'

export const RecipeIngredientInputSchema = z.object({
  name: z.string().min(1).max(120).trim(),
  quantity: QuantityInputSchema,
})
export type RecipeIngredientInput = z.infer<typeof RecipeIngredientInputSchema>

export const CreateRecipeSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  instructions: z.string().min(1).max(10_000),
  servings: z.number().int().min(1).max(50),
  ingredients: z.array(RecipeIngredientInputSchema).min(1).max(100),
})
export type CreateRecipeDto = z.infer<typeof CreateRecipeSchema>

export const UpdateRecipeSchema = CreateRecipeSchema.partial()
export type UpdateRecipeDto = z.infer<typeof UpdateRecipeSchema>

export const RecipeViewSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  instructions: z.string(),
  servings: z.number().int().min(1),
  ingredients: z.array(z.object({
    name: z.string(),
    quantity: z.object({ value: z.number().int().nonnegative(), unit: z.string() }),
  })),
})
export type RecipeView = z.infer<typeof RecipeViewSchema>
