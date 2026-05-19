import { randomUUID } from 'node:crypto'
import { Quantity } from '../../../../../shared/units/quantity'
import { InventoryItem } from '../../domain/entities/inventory-item.entity'
import { DuplicateInventoryLineError } from '../../domain/errors/duplicate-inventory-line.error'
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
  location: 'pantry' | 'fridge' | 'freezer'
  updatedAt: string
}

export interface AddInventoryItemResult {
  item: InventoryItemView
  created: boolean
}

/**
 * Upsert semantics: at most one inventory line per `(householdId, ingredientId, location)`.
 *  - If a line already exists for the triple → its quantity is incremented (created=false).
 *  - Otherwise a new line is created (created=true).
 * Concurrent writes that both reach the create path are caught via
 * `DuplicateInventoryLineError` thrown by the repository's `insert()` (single retry).
 */
export class AddInventoryItemUseCase {
  constructor(
    private readonly items: IInventoryItemRepository,
    private readonly ingredients: IIngredientLookup,
    private readonly idGenerator: () => string = randomUUID,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: AddInventoryItemInput): Promise<AddInventoryItemResult> {
    const ingredient = await this.ingredients.findById(input.ingredientId, input.householdId)
    if (!ingredient) {
      throw new InvalidIngredientReferenceError(input.ingredientId, 'not-found')
    }
    if (ingredient.archived) {
      throw new InvalidIngredientReferenceError(input.ingredientId, 'archived')
    }

    const delta = Quantity.fromUserInput(input.quantity.value, input.quantity.unit)
    if (delta.unit !== ingredient.canonicalUnit) {
      throw new InvalidIngredientReferenceError(input.ingredientId, 'unit-incompatible')
    }

    const location = StorageLocation.fromString(input.location ?? ingredient.storage)
    const now = this.clock()

    const existing = await this.items.findByIngredientAndLocation(
      ingredient.id,
      location,
      input.householdId,
    )
    if (existing) {
      const updated = existing.withQuantity(existing.quantity.add(delta), now)
      await this.items.update(updated)
      return { item: toView(updated, ingredient), created: false }
    }

    const item = InventoryItem.create({
      id: this.idGenerator(),
      householdId: input.householdId,
      ingredientId: ingredient.id,
      quantity: delta,
      location,
      now,
    })

    try {
      await this.items.insert(item)
      return { item: toView(item, ingredient), created: true }
    }
    catch (error) {
      if (error instanceof DuplicateInventoryLineError) {
        // Concurrency race: another writer created the line between our lookup
        // and insert. Refetch, increment, and update.
        const racy = await this.items.findByIngredientAndLocation(
          ingredient.id,
          location,
          input.householdId,
        )
        if (!racy) throw error
        const merged = racy.withQuantity(racy.quantity.add(delta), now)
        await this.items.update(merged)
        return { item: toView(merged, ingredient), created: false }
      }
      throw error
    }
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
