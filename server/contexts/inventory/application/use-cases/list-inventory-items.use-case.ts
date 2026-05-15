import type { IInventoryItemRepository } from '../../domain/ports/inventory-item-repository.port'
import { StorageLocation } from '../../domain/value-objects/storage-location.vo'
import { toView, type InventoryItemView } from './add-inventory-item.use-case'

export interface ListInventoryItemsInput {
  householdId: string
  location?: string
}

export class ListInventoryItemsUseCase {
  constructor(private readonly items: IInventoryItemRepository) {}

  async execute(input: ListInventoryItemsInput): Promise<InventoryItemView[]> {
    const location = input.location ? StorageLocation.fromString(input.location) : undefined
    const items = await this.items.listForHousehold(input.householdId, { location })
    return items.map(toView)
  }
}
