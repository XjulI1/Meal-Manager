import { z } from 'zod'
import { BarcodeResolutionViewSchema } from './product'
import { InventoryItemViewSchema, StorageLocationSchema } from './inventory'
import { QuantityInputSchema } from './units'

/** Response of GET /api/barcodes/:code re-exported here for the scan composable. */
export const ScanResultSchema = BarcodeResolutionViewSchema
export type ScanResult = z.infer<typeof ScanResultSchema>

/** Body of POST /api/inventory/from-scan. */
export const AddFromScanSchema = z.object({
  productId: z.string().uuid(),
  quantity: QuantityInputSchema,
  /** Optional; defaults to ingredient.storage when omitted. */
  location: StorageLocationSchema.optional(),
})
export type AddFromScanInput = z.infer<typeof AddFromScanSchema>

/** Response shared by POST /api/inventory and POST /api/inventory/from-scan. */
export const AddFromScanResponseSchema = z.object({
  item: InventoryItemViewSchema,
  created: z.boolean(),
})
export type AddFromScanResponse = z.infer<typeof AddFromScanResponseSchema>

/** Body of POST /api/inventory/consume-by-barcode. */
export const ConsumeByBarcodeSchema = z.object({
  barcode: z.string().min(8).max(14).trim().regex(/^\d+$/, 'Barcode must contain only digits'),
  quantity: QuantityInputSchema,
  preview: z.boolean().optional(),
})
export type ConsumeByBarcodeInput = z.infer<typeof ConsumeByBarcodeSchema>

const QuantityViewSchema = z.object({
  value: z.number().int().nonnegative(),
  unit: z.string(),
})

/** Preview response: candidate plan, no state change. */
export const ConsumePreviewResponseSchema = z.object({
  candidates: z.array(z.object({
    lineId: z.string().uuid(),
    location: StorageLocationSchema,
    currentQuantity: QuantityViewSchema,
    wouldRemove: QuantityViewSchema,
  })),
  totalAvailable: QuantityViewSchema,
  fullyConsumed: z.boolean(),
})
export type ConsumePreviewResponse = z.infer<typeof ConsumePreviewResponseSchema>

/** Normal-mode response: lines that were actually decremented or deleted. */
export const ConsumeResponseSchema = z.object({
  impactedLines: z.array(z.object({
    lineId: z.string().uuid(),
    location: StorageLocationSchema,
    quantityRemoved: QuantityViewSchema,
    remainingQuantity: QuantityViewSchema,
    deleted: z.boolean(),
  })),
})
export type ConsumeResponse = z.infer<typeof ConsumeResponseSchema>
