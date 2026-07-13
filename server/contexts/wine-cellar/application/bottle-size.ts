import { Quantity } from '../../../../shared/units/quantity'

/** Default bottle contenance: a standard 750 ml (75 cl) bottle. */
export const DEFAULT_BOTTLE_SIZE_ML = 750

export interface BottleSizeInput {
  value: number
  unit: string
}

/** Resolves a contenance to a canonical volume `Quantity` (defaults to 750 ml). */
export function resolveBottleSize(input?: BottleSizeInput): Quantity {
  if (!input) return Quantity.fromCanonical(DEFAULT_BOTTLE_SIZE_ML, 'ml')
  return Quantity.fromUserInput(input.value, input.unit)
}

/** Euros → integer cents (or null). */
export function priceToCents(price: number | null | undefined): number | null {
  if (price === null || price === undefined) return null
  return Math.round(price * 100)
}
