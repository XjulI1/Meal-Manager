import { z } from 'zod'
import { WineColorSchema, WINE_REGIONS } from './wine-cellar'

// --- Label photo input ------------------------------------------------------

/**
 * Image media types accepted for wine-label scanning (matches Anthropic vision
 * support). Kept aligned with `RecipeImageMediaTypeSchema` in `recipe-chat.ts`
 * on purpose — the two capabilities are decoupled but share the same bounds.
 */
export const WineLabelImageMediaTypeSchema = z.enum(['image/jpeg', 'image/png', 'image/webp'])
export type WineLabelImageMediaType = z.infer<typeof WineLabelImageMediaTypeSchema>

/** A wine label is usually one shot (front), optionally a back label. */
export const MAX_LABEL_PHOTOS = 2
/**
 * Max base64 length per image ≈ 5 MB decoded (base64 inflates ~4/3). Same bound
 * as the recipe photo import.
 */
export const MAX_LABEL_PHOTO_BASE64_CHARS = 7_000_000

export const WineLabelImageSchema = z.object({
  mediaType: WineLabelImageMediaTypeSchema,
  /** Raw base64 (no `data:` prefix). */
  data: z.string().min(1).max(MAX_LABEL_PHOTO_BASE64_CHARS),
})
export type WineLabelImageDto = z.infer<typeof WineLabelImageSchema>

export const ScanWineLabelSchema = z.object({
  /** One or more photos of the SAME label, interpreted together. */
  images: z.array(WineLabelImageSchema).min(1).max(MAX_LABEL_PHOTOS),
})
export type ScanWineLabelDto = z.infer<typeof ScanWineLabelSchema>

// --- Wine draft (server → client) -------------------------------------------

const YearSchema = z.number().int().min(1900).max(2200)

/**
 * Structured wine attributes extracted from a label. This is a DRAFT: every wine
 * attribute is optional (an unreadable field is omitted, never invented). Strict
 * invariants (color required, `gardeMin ≤ gardeMax`) are enforced by
 * `CreateWineSchema` when the member submits the form, not here.
 */
export const WineLabelDraftSchema = z.object({
  name: z.string().trim().max(200).optional(),
  domain: z.string().trim().max(200).optional(),
  country: z.string().trim().max(80).optional(),
  region: z.enum(WINE_REGIONS).optional(),
  appellation: z.string().trim().max(200).optional(),
  vintage: YearSchema.optional(),
  color: WineColorSchema.optional(),
  gardeMin: YearSchema.optional(),
  gardeMax: YearSchema.optional(),
  /** Suggested number of bottles to add; defaults to 1. */
  suggestedBottleCount: z.number().int().min(1).max(500).default(1),
})
export type WineLabelDraftDto = z.infer<typeof WineLabelDraftSchema>
