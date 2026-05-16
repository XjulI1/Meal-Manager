import type { CanonicalUnit } from '../../../../../shared/units/conversions'
import { Quantity } from '../../../../../shared/units/quantity'
import { ShoppingListItem } from '../entities/shopping-list-item.entity'
import type { IngredientSummarySnapshot } from '../ports/ingredient-summary-finder.port'
import type { InventorySnapshotItem } from '../ports/inventory-snapshot-finder.port'
import type { RecipeSnapshotInfo } from '../ports/recipe-snapshot-finder.port'

export interface AggregateInput {
  /** Slots with their resolved recipe and the number of servings to prepare. */
  slots: ReadonlyArray<{ recipe: RecipeSnapshotInfo, servings: number }>
  /** Items currently in stock (canonical units). */
  inventory: ReadonlyArray<InventorySnapshotItem>
  /** Denormalization source for name + category at generation time. */
  summaries: ReadonlyMap<string, IngredientSummarySnapshot>
  /** Source of identifiers for the produced list items. */
  idGenerator: () => string
}

interface Bucket {
  ingredientId: string
  quantity: Quantity
}

/**
 * Aggregation algorithm specified in `shopping/spec.md`:
 *   1. For each slot, scale ingredient quantities by `slot.servings / recipe.servings`.
 *   2. Aggregate entries by `(ingredientId, canonical_unit)`. Different
 *      canonical units of the same ingredient stay separate (defensive —
 *      should not occur given `canonical_unit` is fixed per ingredient).
 *   3. Subtract matching inventory items (matched by ingredientId + unit).
 *   4. Drop entries whose remaining quantity is zero or negative (clamped
 *      via Quantity.subtractClamped).
 *   5. Denormalize `name` and `category` from the provided summaries.
 */
export const ShoppingListBuilder = {
  build(input: AggregateInput): ShoppingListItem[] {
    const buckets = new Map<string, Bucket>()

    for (const { recipe, servings } of input.slots) {
      if (recipe.servings <= 0) continue
      const scale = servings / recipe.servings
      if (scale <= 0) continue

      for (const ingredient of recipe.ingredients) {
        const scaled = Quantity.fromCanonical(
          ingredient.quantity.value * scale,
          ingredient.quantity.unit,
        )
        const key = bucketKey(ingredient.ingredientId, ingredient.quantity.unit)
        const existing = buckets.get(key)
        buckets.set(key, existing
          ? { ingredientId: existing.ingredientId, quantity: existing.quantity.add(scaled) }
          : { ingredientId: ingredient.ingredientId, quantity: scaled })
      }
    }

    for (const stock of input.inventory) {
      const key = bucketKey(stock.ingredientId, stock.quantity.unit)
      const existing = buckets.get(key)
      if (!existing) continue
      const remaining = existing.quantity.subtractClamped(stock.quantity)
      if (remaining.isZero()) {
        buckets.delete(key)
      }
      else {
        buckets.set(key, { ingredientId: existing.ingredientId, quantity: remaining })
      }
    }

    return Array.from(buckets.values()).map((b) => {
      const summary = input.summaries.get(b.ingredientId)
      return ShoppingListItem.create({
        id: input.idGenerator(),
        ingredientId: b.ingredientId,
        ingredientName: summary?.name ?? 'Unknown ingredient',
        category: summary?.category ?? 'other',
        quantity: b.quantity,
      })
    })
  },
}

function bucketKey(ingredientId: string, unit: CanonicalUnit): string {
  return `${ingredientId}|${unit}`
}
