import { Quantity } from '../../../../../shared/units/quantity'
import type { CanonicalUnit } from '../../../../../shared/units/conversions'
import { ShoppingListItem } from '../entities/shopping-list-item.entity'
import type { InventorySnapshotItem } from '../ports/inventory-snapshot-finder.port'
import type { RecipeSnapshotInfo } from '../ports/recipe-snapshot-finder.port'

export interface AggregateInput {
  /** Slots with their resolved recipe and the number of servings to prepare. */
  slots: ReadonlyArray<{ recipe: RecipeSnapshotInfo, servings: number }>
  /** Items currently in stock (canonical units). */
  inventory: ReadonlyArray<InventorySnapshotItem>
  /** Source of identifiers for the produced list items. */
  idGenerator: () => string
}

interface Bucket {
  ingredientName: string
  quantity: Quantity
}

/**
 * Aggregation algorithm specified in `shopping/spec.md`:
 *   1. For each slot, scale ingredient quantities by `slot.servings / recipe.servings`.
 *   2. Aggregate entries that share the same trimmed/lowercased name AND the
 *      same canonical unit (different dimensions stay separate — unusual, but
 *      possible with inconsistent user data).
 *   3. Subtract matching inventory items.
 *   4. Drop entries whose remaining quantity is zero or negative (clamped to
 *      zero via Quantity.subtractClamped).
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
        const key = bucketKey(ingredient.name, ingredient.quantity.unit)
        const existing = buckets.get(key)
        buckets.set(key, existing
          ? { ingredientName: existing.ingredientName, quantity: existing.quantity.add(scaled) }
          : { ingredientName: ingredient.name.trim(), quantity: scaled })
      }
    }

    for (const stock of input.inventory) {
      const key = bucketKey(stock.name, stock.quantity.unit)
      const existing = buckets.get(key)
      if (!existing) continue
      const remaining = existing.quantity.subtractClamped(stock.quantity)
      if (remaining.isZero()) {
        buckets.delete(key)
      }
      else {
        buckets.set(key, { ingredientName: existing.ingredientName, quantity: remaining })
      }
    }

    return Array.from(buckets.values())
      .map((b) => ShoppingListItem.create({
        id: input.idGenerator(),
        ingredientName: b.ingredientName,
        quantity: b.quantity,
      }))
  },
}

function bucketKey(name: string, unit: CanonicalUnit): string {
  return `${name.trim().toLowerCase()}|${unit}`
}
