import { z } from 'zod'
import { CanonicalUnitSchema } from './ingredient'

/**
 * DTOs for the AI recipe assistant: chat turns, the structured recipe draft the
 * assistant converges on, URL import, and the catalog-resolution result that
 * feeds the existing recipe form. Consumed server-side (safeParse at the HTTP
 * boundary) and client-side (typing for the useApiRecipeChat composable).
 */

// --- Chat -------------------------------------------------------------------

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(10_000),
})
export type ChatMessageDto = z.infer<typeof ChatMessageSchema>

export const RecipeChatRequestSchema = z.object({
  /** Full conversation history; the API is stateless server-side in v1. */
  messages: z.array(ChatMessageSchema).min(1).max(50),
})
export type RecipeChatRequestDto = z.infer<typeof RecipeChatRequestSchema>

// --- Recipe draft (mirrors the domain RecipeDraft / RecipeIngredientDraft) --

export const QuantityDraftSchema = z.object({
  value: z.number().nonnegative(),
  /** Free-text unit from the assistant/import (e.g. "g", "cuillère à soupe"). */
  unit: z.string().min(1).max(40),
})
export type QuantityDraftDto = z.infer<typeof QuantityDraftSchema>

export const RecipeIngredientDraftSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: QuantityDraftSchema.optional(),
  raw: z.string().max(300).optional(),
})
export type RecipeIngredientDraftDto = z.infer<typeof RecipeIngredientDraftSchema>

export const RecipeDraftSchema = z.object({
  title: z.string().min(1).max(200),
  instructions: z.string().min(1).max(10_000),
  servings: z.number().int().min(1).max(50).optional(),
  ingredients: z.array(RecipeIngredientDraftSchema).max(100),
  sourceUrl: z.string().url().max(2000).optional(),
})
export type RecipeDraftDto = z.infer<typeof RecipeDraftSchema>

// --- URL import -------------------------------------------------------------

export const ImportRecipeSchema = z.object({
  url: z.string().url().max(2000),
})
export type ImportRecipeDto = z.infer<typeof ImportRecipeSchema>

// --- Photo import -----------------------------------------------------------

/** Image media types accepted for photo import (matches Anthropic vision support). */
export const RecipeImageMediaTypeSchema = z.enum(['image/jpeg', 'image/png', 'image/webp'])
export type RecipeImageMediaType = z.infer<typeof RecipeImageMediaTypeSchema>

export const MAX_RECIPE_PHOTOS = 5
/**
 * Max base64 length per image ≈ 5 MB decoded. base64 inflates by ~4/3, so a
 * 5 MB image is ~6.99 M chars; round up slightly to keep a small margin.
 */
export const MAX_RECIPE_PHOTO_BASE64_CHARS = 7_000_000

export const RecipeImageSchema = z.object({
  mediaType: RecipeImageMediaTypeSchema,
  /** Raw base64 (no `data:` prefix). */
  data: z.string().min(1).max(MAX_RECIPE_PHOTO_BASE64_CHARS),
})
export type RecipeImageDto = z.infer<typeof RecipeImageSchema>

export const ImportRecipePhotosSchema = z.object({
  /** One or more photos of the SAME recipe, interpreted together. */
  images: z.array(RecipeImageSchema).min(1).max(MAX_RECIPE_PHOTOS),
})
export type ImportRecipePhotosDto = z.infer<typeof ImportRecipePhotosSchema>

// --- Draft resolution against the household catalog -------------------------

export const ResolvedIngredientSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('matched'),
    /** Original draft name (kept for display). */
    name: z.string(),
    quantity: QuantityDraftSchema.optional(),
    ingredientId: z.string().uuid(),
    /** Resolved catalog name. */
    ingredientName: z.string(),
    canonicalUnit: CanonicalUnitSchema,
  }),
  z.object({
    status: z.literal('new'),
    name: z.string(),
    quantity: QuantityDraftSchema.optional(),
    /** Normalized name to create the ingredient with, pending user confirmation. */
    proposedName: z.string(),
    canonicalUnit: CanonicalUnitSchema,
  }),
])
export type ResolvedIngredientDto = z.infer<typeof ResolvedIngredientSchema>

export const ResolveDraftRequestSchema = z.object({
  draft: RecipeDraftSchema,
})
export type ResolveDraftRequestDto = z.infer<typeof ResolveDraftRequestSchema>

export const DraftResolutionSchema = z.object({
  title: z.string(),
  instructions: z.string(),
  servings: z.number().int().min(1).max(50).optional(),
  sourceUrl: z.string().optional(),
  ingredients: z.array(ResolvedIngredientSchema),
})
export type DraftResolutionDto = z.infer<typeof DraftResolutionSchema>
