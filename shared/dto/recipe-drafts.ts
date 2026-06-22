import { z } from 'zod'
import { RecipeIngredientDraftSchema } from './recipe-chat'

/**
 * DTOs for PERSISTED recipe drafts (per-household, work-in-progress recipes).
 * Distinct from the ephemeral `RecipeDraftSchema` (AI extraction output): a
 * persisted draft is permissive (all content fields optional, free-text
 * ingredients) and carries a `source` recording its origin. Consumed server-side
 * (safeParse at the HTTP boundary) and client-side (useApiRecipeDrafts typing).
 */

export const RecipeDraftSourceSchema = z.enum(['manual', 'ai-chat', 'ai-url', 'ai-photo', 'mcp'])
export type RecipeDraftSourceDto = z.infer<typeof RecipeDraftSourceSchema>

/** Content of a draft — shared by create/update; every field optional. */
export const RecipeDraftContentSchema = z.object({
  title: z.string().max(200).optional(),
  instructions: z.string().max(10_000).optional(),
  servings: z.number().int().min(1).max(50).optional(),
  ingredients: z.array(RecipeIngredientDraftSchema).max(100).optional(),
  sourceUrl: z.string().url().max(2000).optional(),
})

export const SaveRecipeDraftSchema = RecipeDraftContentSchema.extend({
  source: RecipeDraftSourceSchema,
})
export type SaveRecipeDraftDto = z.infer<typeof SaveRecipeDraftSchema>

/** Update is a partial content patch; `source` is immutable and not accepted. */
export const UpdateRecipeDraftSchema = RecipeDraftContentSchema
export type UpdateRecipeDraftDto = z.infer<typeof UpdateRecipeDraftSchema>

export const RecipeDraftIngredientViewSchema = z.object({
  name: z.string(),
  quantity: z.object({ value: z.number().nonnegative(), unit: z.string() }).optional(),
  raw: z.string().optional(),
})

export const RecipeDraftViewSchema = z.object({
  id: z.string().uuid(),
  source: RecipeDraftSourceSchema,
  title: z.string().nullable(),
  instructions: z.string().nullable(),
  servings: z.number().int().nullable(),
  ingredients: z.array(RecipeDraftIngredientViewSchema),
  sourceUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type RecipeDraftView = z.infer<typeof RecipeDraftViewSchema>

export const RecipeDraftSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string().nullable(),
  source: RecipeDraftSourceSchema,
  updatedAt: z.string(),
})
export type RecipeDraftSummary = z.infer<typeof RecipeDraftSummarySchema>
