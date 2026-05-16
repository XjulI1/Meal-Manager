import type { IIngredientLookup } from '../../domain/ports/ingredient-lookup.port'
import type { IInventoryItemRepository } from '../../domain/ports/inventory-item-repository.port'
import { StorageLocation } from '../../domain/value-objects/storage-location.vo'
import { toView, type InventoryItemView } from './add-inventory-item.use-case'

export interface ListInventoryItemsInput {
  householdId: string
  location?: string
}

export class ListInventoryItemsUseCase {
  constructor(
    private readonly items: IInventoryItemRepository,
    private readonly ingredients: IIngredientLookup,
  ) {}

  async execute(input: ListInventoryItemsInput): Promise<InventoryItemView[]> {
    const location = input.location ? StorageLocation.fromString(input.location) : undefined
    const items = await this.items.listForHousehold(input.householdId, { location })
    if (items.length === 0) return []

    const ingredientIds = items.map((i) => i.ingredientId)
    const summaries = await this.ingredients.findByIds(ingredientIds, input.householdId)
    return items.map((item) => {
      const summary = summaries.get(item.ingredientId)
      if (!summary) {
        // FK guarantees the ingredient exists; defensive fallback so a missing
        // lookup doesn't 500 the whole list.
        return toView(item, {
          id: item.ingredientId,
          name: 'Unknown ingredient',
          category: 'other',
          canonicalUnit: item.quantity.unit,
          storage: item.location.value,
          archived: false,
        })
      }
      return toView(item, summary)
    })
  }
}
