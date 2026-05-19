import { Quantity } from '../../../../../shared/units/quantity'
import { InsufficientQuantityError } from '../../domain/errors/insufficient-quantity.error'
import { InvalidIngredientReferenceError } from '../../domain/errors/invalid-ingredient-reference.error'
import { ItemNotFoundError } from '../../domain/errors/item-not-found.error'
import type { IBarcodeResolver } from '../../domain/ports/barcode-resolver'
import type { IIngredientLookup } from '../../domain/ports/ingredient-lookup.port'
import type { IInventoryItemRepository } from '../../domain/ports/inventory-item-repository.port'

export interface ConsumeByBarcodeInput {
  householdId: string
  barcode: string
  quantity: { value: number, unit: string }
  preview?: boolean
}

interface QuantityView { value: number, unit: string }

export interface ConsumePreviewLine {
  lineId: string
  location: 'pantry' | 'fridge' | 'freezer'
  currentQuantity: QuantityView
  wouldRemove: QuantityView
}

export interface ConsumeImpactedLine {
  lineId: string
  location: 'pantry' | 'fridge' | 'freezer'
  quantityRemoved: QuantityView
  remainingQuantity: QuantityView
  deleted: boolean
}

export type ConsumeByBarcodeResult =
  | {
      mode: 'preview'
      candidates: ConsumePreviewLine[]
      totalAvailable: QuantityView
      fullyConsumed: boolean
    }
  | {
      mode: 'normal'
      impactedLines: ConsumeImpactedLine[]
    }

/**
 * Drain order: the line at `ingredient.storage` first, then the others by
 * `createdAt ASC`. Overflow between lines is allowed; when a line reaches
 * zero it is removed (consistent with `AdjustQuantityUseCase`).
 *
 * `preview: true` computes the plan without modifying any state — used by the
 * UI when the ingredient has lines in multiple locations and the user wants
 * to see the cascade before confirming.
 */
export class ConsumeInventoryItemByBarcodeUseCase {
  constructor(
    private readonly items: IInventoryItemRepository,
    private readonly barcodes: IBarcodeResolver,
    private readonly ingredients: IIngredientLookup,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: ConsumeByBarcodeInput): Promise<ConsumeByBarcodeResult> {
    const resolved = await this.barcodes.resolve(input.barcode, input.householdId)
    if (!resolved || !resolved.ingredientId) {
      throw new ItemNotFoundError(input.barcode)
    }
    const ingredient = await this.ingredients.findById(resolved.ingredientId, input.householdId)
    if (!ingredient) {
      throw new InvalidIngredientReferenceError(resolved.ingredientId, 'not-found')
    }

    const demand = Quantity.fromUserInput(input.quantity.value, input.quantity.unit)
    if (demand.unit !== ingredient.canonicalUnit) {
      throw new InvalidIngredientReferenceError(resolved.ingredientId, 'unit-incompatible')
    }

    const all = await this.items.listByIngredient(resolved.ingredientId, input.householdId)
    if (all.length === 0) {
      throw new InsufficientQuantityError(demand.value, 0, demand.unit)
    }

    // Default location first, then others by createdAt ASC.
    const sorted = [...all].sort((a, b) => {
      const aDefault = a.location.value === ingredient.storage ? 0 : 1
      const bDefault = b.location.value === ingredient.storage ? 0 : 1
      if (aDefault !== bDefault) return aDefault - bDefault
      return a.createdAt.getTime() - b.createdAt.getTime()
    })

    const totalAvailableValue = sorted.reduce((sum, item) => sum + item.quantity.value, 0)
    if (totalAvailableValue < demand.value) {
      throw new InsufficientQuantityError(demand.value, totalAvailableValue, demand.unit)
    }

    // Build the cascade plan.
    let remaining = demand.value
    const plan: Array<{
      item: typeof sorted[number]
      removed: number
    }> = []
    for (const item of sorted) {
      if (remaining <= 0) break
      const take = Math.min(item.quantity.value, remaining)
      if (take > 0) {
        plan.push({ item, removed: take })
        remaining -= take
      }
    }

    if (input.preview) {
      return {
        mode: 'preview',
        candidates: plan.map(({ item, removed }) => ({
          lineId: item.id,
          location: item.location.value,
          currentQuantity: { value: item.quantity.value, unit: item.quantity.unit },
          wouldRemove: { value: removed, unit: item.quantity.unit },
        })),
        totalAvailable: { value: totalAvailableValue, unit: demand.unit },
        fullyConsumed: plan.every(({ item, removed }) => removed === item.quantity.value),
      }
    }

    const now = this.clock()
    const impacted: ConsumeImpactedLine[] = []
    for (const { item, removed } of plan) {
      const removedQty = Quantity.fromCanonical(removed, item.quantity.unit)
      const newQty = item.quantity.subtract(removedQty)
      if (newQty.isZero()) {
        await this.items.delete(item.id, input.householdId)
        impacted.push({
          lineId: item.id,
          location: item.location.value,
          quantityRemoved: { value: removed, unit: item.quantity.unit },
          remainingQuantity: { value: 0, unit: item.quantity.unit },
          deleted: true,
        })
      }
      else {
        const updated = item.withQuantity(newQty, now)
        await this.items.update(updated)
        impacted.push({
          lineId: item.id,
          location: item.location.value,
          quantityRemoved: { value: removed, unit: item.quantity.unit },
          remainingQuantity: { value: newQty.value, unit: item.quantity.unit },
          deleted: false,
        })
      }
    }

    return { mode: 'normal', impactedLines: impacted }
  }
}
