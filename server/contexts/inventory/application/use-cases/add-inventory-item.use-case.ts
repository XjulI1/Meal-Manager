import { randomUUID } from 'node:crypto'
import { Quantity } from '../../../../../shared/units/quantity'
import { InventoryItem } from '../../domain/entities/inventory-item.entity'
import { InvalidIngredientReferenceError } from '../../domain/errors/invalid-ingredient-reference.error'
import type { IIngredientLookup, IngredientSummary } from '../../domain/ports/ingredient-lookup.port'
import type { IInventoryItemRepository } from '../../domain/ports/inventory-item-repository.port'
import { StorageLocation } from '../../domain/value-objects/storage-location.vo'

export interface AddInventoryItemInput {
  householdId: string
  ingredientId: string
  quantity: { value: number, unit: string }
  /** Optional; defaults to ingredient.storage when omitted. */
  location?: string
}

export interface InventoryItemView {
  id: string
  ingredientId: string
  name: string
  category: string
  quantity: { value: number, unit: string }
  location: 'pantry' | 'fridge'
  updatedAt: string
}

export class AddInventoryItemUseCase {
  constructor(
    private readonly items: IInventoryItemRepository,
    private readonly ingredients: IIngredientLookup,
    private readonly idGenerator: () => string = randomUUID,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: AddInventoryItemInput): Promise<InventoryItemView> {
    const ingredient = await this.ingredients.findById(input.ingredientId, input.householdId)
    if (!ingredient) {
      throw new InvalidIngredientReferenceError(input.ingredientId, 'not-found')
    }
    if (ingredient.archived) {
      throw new InvalidIngredientReferenceError(input.ingredientId, 'archived')
    }

    const quantity = Quantity.fromUserInput(input.quantity.value, input.quantity.unit)
    if (quantity.unit !== ingredient.canonicalUnit) {
      throw new InvalidIngredientReferenceError(input.ingredientId, 'unit-incompatible')
    }

    const now = this.clock()
    const location = StorageLocation.fromString(input.location ?? ingredient.storage)

    const item = InventoryItem.create({
      id: this.idGenerator(),
      householdId: input.householdId,
      ingredientId: ingredient.id,
      quantity,
      location,
      now,
    })
    await this.items.save(item)
    return toView(item, ingredient)
  }
}

export function toView(item: InventoryItem, ingredient: IngredientSummary): InventoryItemView {
  return {
    id: item.id,
    ingredientId: item.ingredientId,
    name: ingredient.name,
    category: ingredient.category,
    quantity: { value: item.quantity.value, unit: item.quantity.unit },
    location: item.location.value,
    updatedAt: item.updatedAt.toISOString(),
  }
}
