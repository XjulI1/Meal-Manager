import type { InventoryItem } from '../../../../server/contexts/inventory/domain/entities/inventory-item.entity'
import type {
  IInventoryItemRepository,
  ListInventoryFilter,
} from '../../../../server/contexts/inventory/domain/ports/inventory-item-repository.port'

export class InMemoryInventoryItemRepository implements IInventoryItemRepository {
  private readonly items = new Map<string, InventoryItem>()

  async findById(id: string, householdId: string): Promise<InventoryItem | null> {
    const item = this.items.get(id)
    if (!item || item.householdId !== householdId) return null
    return item
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
    return out.sort((a, b) => a.name.localeCompare(b.name))
  }

  async save(item: InventoryItem): Promise<void> {
    this.items.set(item.id, item)
  }

  async delete(id: string, householdId: string): Promise<void> {
    const existing = this.items.get(id)
    if (existing && existing.householdId === householdId) {
      this.items.delete(id)
    }
  }
}
