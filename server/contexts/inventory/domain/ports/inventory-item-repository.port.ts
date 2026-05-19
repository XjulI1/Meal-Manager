import type { InventoryItem } from '../entities/inventory-item.entity'
import type { StorageLocation } from '../value-objects/storage-location.vo'

export interface ListInventoryFilter {
  location?: StorageLocation
}

export interface IInventoryItemRepository {
  /** Returns the inventory item if it belongs to the given household, otherwise null. */
  findById(id: string, householdId: string): Promise<InventoryItem | null>

  /**
   * Returns the inventory item matching the (ingredientId, location) tuple
   * in the given household, or null. Backs the upsert semantics of
   * `AddInventoryItemUseCase` and the location-conflict check on update.
   */
  findByIngredientAndLocation(
    ingredientId: string,
    location: StorageLocation,
    householdId: string,
  ): Promise<InventoryItem | null>

  /** Returns all inventory items of a household, optionally filtered by location, ordered by name. */
  listForHousehold(householdId: string, filter?: ListInventoryFilter): Promise<InventoryItem[]>

  /**
   * Returns all inventory items for a given ingredient in the household.
   * No specific ordering — the caller applies the domain ordering it needs
   * (e.g., default storage first, then createdAt ASC for consume-by-barcode).
   */
  listByIngredient(ingredientId: string, householdId: string): Promise<InventoryItem[]>

  /**
   * Pure INSERT of a new inventory item. MUST throw `DuplicateInventoryLineError`
   * if the `(householdId, ingredientId, location)` triple is already taken
   * (catches concurrent-write races; the use case retries with `update()`).
   */
  insert(item: InventoryItem): Promise<void>

  /** Pure UPDATE by `id`. The caller MUST have loaded the item by id first. */
  update(item: InventoryItem): Promise<void>

  /** Delete an inventory item belonging to the given household. */
  delete(id: string, householdId: string): Promise<void>
}
