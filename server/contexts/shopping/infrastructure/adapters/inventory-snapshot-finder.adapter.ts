import type { IInventoryItemRepository } from '../../../inventory/domain/ports/inventory-item-repository.port'
import type {
  IInventorySnapshotFinder,
  InventorySnapshotItem,
} from '../../domain/ports/inventory-snapshot-finder.port'

export class InventoryAdapter implements IInventorySnapshotFinder {
  constructor(private readonly items: IInventoryItemRepository) {}

  async listForHousehold(householdId: string): Promise<InventorySnapshotItem[]> {
    const items = await this.items.listForHousehold(householdId)
    return items.map((item) => ({ name: item.name, quantity: item.quantity }))
  }
}
