import { z } from 'zod'

// ── Enums & closed lists ────────────────────────────────────────────────────

export const WineColorSchema = z.enum(['rouge', 'blanc', 'rose', 'effervescent'])
export type WineColor = z.infer<typeof WineColorSchema>

/** French wine regions (closed list) + `autre`. Stored as the slug. */
export const WINE_REGIONS = [
  'bourgogne',
  'bordeaux',
  'beaujolais',
  'vallee-du-rhone',
  'vallee-de-la-loire',
  'alsace',
  'champagne',
  'languedoc',
  'provence',
  'sud-ouest',
  'jura',
  'savoie',
  'autre',
] as const
export const WineRegionSchema = z.enum(WINE_REGIONS)
export type WineRegion = z.infer<typeof WineRegionSchema>

export const BottleDepthSchema = z.enum(['front', 'back'])
export type BottleDepth = z.infer<typeof BottleDepthSchema>

export const BottleStatusSchema = z.enum(['in_stock', 'consumed'])
export type BottleStatus = z.infer<typeof BottleStatusSchema>

export const ExitReasonSchema = z.enum(['consumed', 'gifted', 'broken'])
export type ExitReason = z.infer<typeof ExitReasonSchema>

/** A bottle contenance expressed by the user (defaults handled server-side). */
export const BottleSizeInputSchema = z.object({
  value: z.number().finite().positive(),
  unit: z.enum(['ml', 'cl', 'dl', 'l']),
})
export type BottleSizeInput = z.infer<typeof BottleSizeInputSchema>

const YearSchema = z.number().int().min(1900).max(2200)
const DateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

// ── Structure (cellar → shelf → row) ────────────────────────────────────────

export const CreateCellarSchema = z.object({
  name: z.string().trim().min(1).max(120),
})
export type CreateCellarDto = z.infer<typeof CreateCellarSchema>

export const RenameCellarSchema = CreateCellarSchema
export type RenameCellarDto = z.infer<typeof RenameCellarSchema>

export const AddShelfSchema = z.object({
  label: z.string().trim().max(120).optional(),
  position: z.number().int().positive().optional(),
})
export type AddShelfDto = z.infer<typeof AddShelfSchema>

export const RenameShelfSchema = z.object({
  label: z.string().trim().max(120),
})
export type RenameShelfDto = z.infer<typeof RenameShelfSchema>

export const AddRowSchema = z.object({
  position: z.number().int().positive().optional(),
  capacityBack: z.number().int().min(1).max(1000),
  capacityFront: z.number().int().min(0).max(1000).default(0),
})
export type AddRowDto = z.infer<typeof AddRowSchema>

export const UpdateRowSchema = z.object({
  position: z.number().int().positive().optional(),
  capacityBack: z.number().int().min(1).max(1000).optional(),
  capacityFront: z.number().int().min(0).max(1000).optional(),
})
export type UpdateRowDto = z.infer<typeof UpdateRowSchema>

// ── Wine reference ──────────────────────────────────────────────────────────

/**
 * A label photo to upload and persist. Mutually exclusive with a direct
 * `photoUrl`. The server stores it and sets `photoUrl` to the served URL.
 */
export const WineLabelInputSchema = z.object({
  mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  /** Raw base64 (no `data:` prefix). Max ≈ 5 MB decoded. */
  data: z.string().min(1).max(7_000_000),
})
export type WineLabelInputDto = z.infer<typeof WineLabelInputSchema>

/** Base wine fields; refined into Create/Update below. */
// Nullable + optional on the entity's nullable fields: `undefined` = unchanged
// (partial update), `null` = explicitly clear the value.
const WineFieldsSchema = z.object({
  name: z.string().trim().min(1).max(200),
  domain: z.string().trim().max(200).nullable().optional(),
  country: z.string().trim().max(80).nullable().optional(),
  region: WineRegionSchema.nullable().optional(),
  appellation: z.string().trim().max(200).nullable().optional(),
  vintage: YearSchema.nullable().optional(),
  color: WineColorSchema,
  gardeMin: YearSchema.nullable().optional(),
  gardeMax: YearSchema.nullable().optional(),
  comment: z.string().trim().max(2000).nullable().optional(),
  photoUrl: z.string().trim().url().max(500).nullable().optional(),
  /** Upload a label photo to persist; exclusive with `photoUrl`. */
  labelPhoto: WineLabelInputSchema.optional(),
  rating: z.number().int().min(0).max(5).nullable().optional(),
})

/** photoUrl and labelPhoto MUST NOT be supplied together. */
const noPhotoConflict = (v: { photoUrl?: string | null, labelPhoto?: unknown }): boolean => !(v.photoUrl && v.labelPhoto)
const PHOTO_CONFLICT_MESSAGE = { message: 'photoUrl and labelPhoto are mutually exclusive', path: ['labelPhoto'] }

export const CreateWineSchema = WineFieldsSchema.refine(noPhotoConflict, PHOTO_CONFLICT_MESSAGE)
export type CreateWineDto = z.infer<typeof CreateWineSchema>

export const UpdateWineSchema = WineFieldsSchema.partial().refine(noPhotoConflict, PHOTO_CONFLICT_MESSAGE)
export type UpdateWineDto = z.infer<typeof UpdateWineSchema>

/**
 * Structured output of the AI wine enrichment (`enrich_wine` tool). Every field
 * is optional: an omitted field means the research found nothing reliable and
 * the existing value is kept. `gardeMin`/`gardeMax` are absolute apogée years.
 */
export const WineEnrichmentSchema = z.object({
  gardeMin: YearSchema.optional(),
  gardeMax: YearSchema.optional(),
  aromas: z.string().trim().min(1).max(2000).optional(),
  foodPairings: z.string().trim().min(1).max(2000).optional(),
})
export type WineEnrichmentDto = z.infer<typeof WineEnrichmentSchema>

// ── Bottles ─────────────────────────────────────────────────────────────────

export const AddBottlesSchema = z.object({
  quantity: z.number().int().min(1).max(500),
  size: BottleSizeInputSchema.optional(),
  buyingPrice: z.number().nonnegative().optional(),
  addedDate: DateOnlySchema.optional(),
})
export type AddBottlesDto = z.infer<typeof AddBottlesSchema>

export const UpdateBottleSchema = z.object({
  size: BottleSizeInputSchema.optional(),
  buyingPrice: z.number().nonnegative().nullable().optional(),
  addedDate: DateOnlySchema.nullable().optional(),
})
export type UpdateBottleDto = z.infer<typeof UpdateBottleSchema>

export const SlotPositionSchema = z.object({
  rowId: z.string().uuid(),
  depth: BottleDepthSchema,
  index: z.number().int().min(1),
})
export type SlotPositionDto = z.infer<typeof SlotPositionSchema>

/** `position: null` sends the bottle back to the unplaced pool. */
export const PlaceBottleSchema = z.object({
  position: z.union([SlotPositionSchema, z.null()]),
})
export type PlaceBottleDto = z.infer<typeof PlaceBottleSchema>

export const ExitBottleSchema = z.object({
  reason: ExitReasonSchema,
  exitDate: DateOnlySchema.optional(),
  tastingNote: z.string().trim().max(2000).optional(),
})
export type ExitBottleDto = z.infer<typeof ExitBottleSchema>

export const ListBottlesQuerySchema = z.object({
  color: WineColorSchema.optional(),
  region: WineRegionSchema.optional(),
  domain: z.string().trim().optional(),
  /** Global free-text search across wine name, domain, appellation, country, region, vintage. */
  q: z.string().trim().optional(),
  /** `placed` | `unplaced` | undefined (all in-stock). */
  placement: z.enum(['placed', 'unplaced']).optional(),
  /** Apogée filter: bottles drinkable in this year (gardeMin ≤ y ≤ gardeMax). */
  drinkableInYear: z.coerce.number().int().min(1900).max(2200).optional(),
  sort: z.enum(['name', 'vintage', 'region']).optional(),
})
export type ListBottlesQueryDto = z.infer<typeof ListBottlesQuerySchema>

export const ListWinesQuerySchema = z.object({
  color: WineColorSchema.optional(),
  region: WineRegionSchema.optional(),
  domain: z.string().trim().optional(),
  /** Global free-text search across wine name, domain, appellation, country, region, vintage. */
  q: z.string().trim().optional(),
  sort: z.enum(['name', 'vintage', 'region']).optional(),
})
export type ListWinesQueryDto = z.infer<typeof ListWinesQuerySchema>

// ── Views (server → client) ─────────────────────────────────────────────────

export const WineViewSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  domain: z.string().nullable(),
  country: z.string().nullable(),
  region: WineRegionSchema.nullable(),
  appellation: z.string().nullable(),
  vintage: z.number().int().nullable(),
  color: WineColorSchema,
  gardeMin: z.number().int().nullable(),
  gardeMax: z.number().int().nullable(),
  comment: z.string().nullable(),
  /** AI-researched aromatic profile (free text); null if never enriched. */
  aromas: z.string().nullable(),
  /** AI-researched food pairings (free text); null if never enriched. */
  foodPairings: z.string().nullable(),
  /** ISO timestamp of the last AI enrichment; null if never enriched. */
  aiEnrichedAt: z.string().nullable(),
  photoUrl: z.string().nullable(),
  rating: z.number().int().nullable(),
  /** Count of in-stock bottles of this wine. */
  bottleCount: z.number().int().nonnegative(),
})
export type WineView = z.infer<typeof WineViewSchema>

export const BottlePlacementViewSchema = z.object({
  cellarId: z.string().uuid(),
  cellarName: z.string(),
  shelfId: z.string().uuid(),
  shelfLabel: z.string().nullable(),
  shelfPosition: z.number().int(),
  rowId: z.string().uuid(),
  rowPosition: z.number().int(),
  depth: BottleDepthSchema,
  index: z.number().int(),
})
export type BottlePlacementView = z.infer<typeof BottlePlacementViewSchema>

export const BottleViewSchema = z.object({
  id: z.string().uuid(),
  wineId: z.string().uuid(),
  size: z.object({ value: z.number().int(), unit: z.string() }),
  buyingPrice: z.number().nullable(),
  addedDate: z.string().nullable(),
  status: BottleStatusSchema,
  /** null when the bottle is in the "à ranger" pool. */
  placement: BottlePlacementViewSchema.nullable(),
})
export type BottleView = z.infer<typeof BottleViewSchema>

/** A bottle enriched with its wine, used by the filterable list view. */
export const BottleListItemViewSchema = z.object({
  bottle: BottleViewSchema,
  wine: WineViewSchema,
})
export type BottleListItemView = z.infer<typeof BottleListItemViewSchema>

export const SlotViewSchema = z.object({
  depth: BottleDepthSchema,
  index: z.number().int(),
  bottle: BottleViewSchema.nullable(),
  wine: WineViewSchema.nullable(),
})
export type SlotView = z.infer<typeof SlotViewSchema>

export const RowLayoutViewSchema = z.object({
  id: z.string().uuid(),
  position: z.number().int(),
  capacityBack: z.number().int(),
  capacityFront: z.number().int(),
  back: z.array(SlotViewSchema),
  front: z.array(SlotViewSchema),
})
export type RowLayoutView = z.infer<typeof RowLayoutViewSchema>

export const ShelfLayoutViewSchema = z.object({
  id: z.string().uuid(),
  label: z.string().nullable(),
  position: z.number().int(),
  rows: z.array(RowLayoutViewSchema),
})
export type ShelfLayoutView = z.infer<typeof ShelfLayoutViewSchema>

export const CellarViewSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  shelfCount: z.number().int().nonnegative(),
  bottleCount: z.number().int().nonnegative(),
})
export type CellarView = z.infer<typeof CellarViewSchema>

export const CellarLayoutViewSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  shelves: z.array(ShelfLayoutViewSchema),
})
export type CellarLayoutView = z.infer<typeof CellarLayoutViewSchema>

export const ExitJournalEntryViewSchema = z.object({
  bottleId: z.string().uuid(),
  wineId: z.string().uuid(),
  wineName: z.string(),
  vintage: z.number().int().nullable(),
  reason: ExitReasonSchema,
  exitDate: z.string().nullable(),
  tastingNote: z.string().nullable(),
})
export type ExitJournalEntryView = z.infer<typeof ExitJournalEntryViewSchema>

export const ImportSkippedRowSchema = z.object({
  row: z.number().int(),
  reason: z.string(),
})
export type ImportSkippedRow = z.infer<typeof ImportSkippedRowSchema>

export const ImportReportViewSchema = z.object({
  winesCreated: z.number().int().nonnegative(),
  bottlesCreated: z.number().int().nonnegative(),
  skippedRows: z.array(ImportSkippedRowSchema),
})
export type ImportReportView = z.infer<typeof ImportReportViewSchema>

/** Import upload: the .xlsx file, base64-encoded (consistent with photo import). */
export const ImportVinotagSchema = z.object({
  fileBase64: z.string().min(1),
  filename: z.string().optional(),
})
export type ImportVinotagDto = z.infer<typeof ImportVinotagSchema>
