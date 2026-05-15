import type { InventoryItem } from '../entities/inventory-item.entity'
import type { StorageLocation } from '../value-objects/storage-location.vo'

export interface ListInventoryFilter {
  location?: StorageLocation
}

export interface IInventoryItemRepository {
  /** Returns the inventory item if it belongs to the given household, otherwise null. */
  findById(id: string, householdId: string): Promise<InventoryItem | null>

  /** Returns all inventory items of a household, optionally filtered by location, ordered by name. */
  listForHousehold(householdId: string, filter?: ListInventoryFilter): Promise<InventoryItem[]>

  /** Upsert an inventory item (insert if new, update if existing). */
  save(item: InventoryItem): Promise<void>

  /** Delete an inventory item belonging to the given household. */
  delete(id: string, householdId: string): Promise<void>
}
