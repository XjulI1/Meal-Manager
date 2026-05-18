import type { InventoryItem } from '../../../../server/contexts/inventory/domain/entities/inventory-item.entity'
import { DuplicateInventoryLineError } from '../../../../server/contexts/inventory/domain/errors/duplicate-inventory-line.error'
import type {
  IInventoryItemRepository,
  ListInventoryFilter,
} from '../../../../server/contexts/inventory/domain/ports/inventory-item-repository.port'
import type { StorageLocation } from '../../../../server/contexts/inventory/domain/value-objects/storage-location.vo'

export class InMemoryInventoryItemRepository implements IInventoryItemRepository {
  private readonly items = new Map<string, InventoryItem>()
  /**
   * Hook used by tests to simulate the concurrency race in the upsert use case:
   *   1. The first `findByIngredientAndLocation()` call returns null even if a
   *      matching row exists (the racy writer hasn't committed yet from the
   *      caller's point of view).
   *   2. The next `insert()` then throws `DuplicateInventoryLineError` (the
   *      DB sees the racy row and rejects the INSERT).
   *   3. The retry path re-reads (this time the hook is consumed) and the
   *      racy row is visible, so the use case increments it.
   *
   * Toggling both flags together exercises the full retry path.
   */
  skipNextFindByIngredientAndLocation = false
  forceNextInsertConflict = false

  async findById(id: string, householdId: string): Promise<InventoryItem | null> {
    const item = this.items.get(id)
    if (!item || item.householdId !== householdId) return null
    return item
  }

  async findByIngredientAndLocation(
    ingredientId: string,
    location: StorageLocation,
    householdId: string,
  ): Promise<InventoryItem | null> {
    if (this.skipNextFindByIngredientAndLocation) {
      this.skipNextFindByIngredientAndLocation = false
      return null
    }
    for (const item of this.items.values()) {
      if (
        item.householdId === householdId
        && item.ingredientId === ingredientId
        && item.location.equals(location)
      ) {
        return item
      }
    }
    return null
  }

  async listForHousehold(
    householdId: string,
    filter: ListInventoryFilter = {},
  ): Promise<InventoryItem[]> {
    const out: InventoryItem[] = []
    for (const item of this.items.values()) {
      if (item.householdId !== householdId) continue
      if (filter.location && !item.location.equals(filter.location)) continue
      out.push(item)
    }
    return out.sort((a, b) => a.ingredientId.localeCompare(b.ingredientId))
  }

  async listByIngredient(ingredientId: string, householdId: string): Promise<InventoryItem[]> {
    const out: InventoryItem[] = []
    for (const item of this.items.values()) {
      if (item.householdId === householdId && item.ingredientId === ingredientId) {
        out.push(item)
      }
    }
    return out.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  }

  async insert(item: InventoryItem): Promise<void> {
    if (this.forceNextInsertConflict) {
      this.forceNextInsertConflict = false
      throw new DuplicateInventoryLineError(item.householdId, item.ingredientId, item.location.value)
    }
    const existing = await this.findByIngredientAndLocation(item.ingredientId, item.location, item.householdId)
    if (existing) {
      throw new DuplicateInventoryLineError(item.householdId, item.ingredientId, item.location.value)
    }
    this.items.set(item.id, item)
  }

  async update(item: InventoryItem): Promise<void> {
    const existing = this.items.get(item.id)
    if (!existing || existing.householdId !== item.householdId) return
    this.items.set(item.id, item)
  }

  async delete(id: string, householdId: string): Promise<void> {
    const existing = this.items.get(id)
    if (existing && existing.householdId === householdId) {
      this.items.delete(id)
    }
  }
}
