/**
 * Port for extracting a wine's attributes from one or more label photos. All
 * provided images describe the SAME label (front / back) and are interpreted
 * together. The v1 implementation uses the Anthropic vision API.
 *
 * The result is always a draft (never persisted) used to pre-fill the wine form.
 * Every wine attribute is optional — an unreadable field is omitted, never
 * invented. `region` MUST be a closed-list slug or `autre`; `color` one of the
 * four robes when determinable. Strict invariants are validated at wine
 * creation, not here.
 */
export interface WineLabelDraftContent {
  name?: string
  domain?: string
  country?: string
  region?: string
  appellation?: string
  vintage?: number
  color?: string
  gardeMin?: number
  gardeMax?: number
  /** Suggested number of bottles to add; defaults to 1. */
  suggestedBottleCount: number
}

export interface WineLabelImageInput {
  /** MIME type — the transport restricts this to image/jpeg|png|webp. */
  mediaType: string
  /** Image bytes encoded as base64 (no `data:` prefix). */
  data: string
}

export interface IWineLabelExtractor {
  extractFromPhotos(images: ReadonlyArray<WineLabelImageInput>): Promise<WineLabelDraftContent>
}
