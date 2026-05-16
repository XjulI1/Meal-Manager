import { Quantity } from '../../../../../shared/units/quantity'
import { InvalidIngredientReferenceError } from '../../domain/errors/invalid-ingredient-reference.error'
import { ItemNotFoundError } from '../../domain/errors/item-not-found.error'
import type { IIngredientLookup } from '../../domain/ports/ingredient-lookup.port'
import type { IInventoryItemRepository } from '../../domain/ports/inventory-item-repository.port'
import { StorageLocation } from '../../domain/value-objects/storage-location.vo'
import { toView, type InventoryItemView } from './add-inventory-item.use-case'

export interface UpdateInventoryItemInput {
  householdId: string
  id: string
  quantity?: { value: number, unit: string }
  location?: string
}

export class UpdateInventoryItemUseCase {
  constructor(
    private readonly items: IInventoryItemRepository,
    private readonly ingredients: IIngredientLookup,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: UpdateInventoryItemInput): Promise<InventoryItemView> {
    const existing = await this.items.findById(input.id, input.householdId)
    if (!existing) {
      throw new ItemNotFoundError(input.id)
    }

    const ingredient = await this.ingredients.findById(existing.ingredientId, input.householdId)
    if (!ingredient) {
      // FK should make this impossible; defensive.
      throw new InvalidIngredientReferenceError(existing.ingredientId, 'not-found')
    }

    const now = this.clock()
    let updated = existing
    if (input.quantity !== undefined) {
      const quantity = Quantity.fromUserInput(input.quantity.value, input.quantity.unit)
      if (quantity.unit !== ingredient.canonicalUnit) {
        throw new InvalidIngredientReferenceError(existing.ingredientId, 'unit-incompatible')
      }
      updated = updated.withQuantity(quantity, now)
    }
    if (input.location !== undefined) {
      updated = updated.withLocation(StorageLocation.fromString(input.location), now)
    }

    await this.items.save(updated)
    return toView(updated, ingredient)
  }
}
