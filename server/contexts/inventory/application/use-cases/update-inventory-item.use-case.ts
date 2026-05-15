import { Quantity } from '../../../../../shared/units/quantity'
import { ItemNotFoundError } from '../../domain/errors/item-not-found.error'
import type { IInventoryItemRepository } from '../../domain/ports/inventory-item-repository.port'
import { StorageLocation } from '../../domain/value-objects/storage-location.vo'
import { toView, type InventoryItemView } from './add-inventory-item.use-case'

export interface UpdateInventoryItemInput {
  householdId: string
  id: string
  name?: string
  quantity?: { value: number, unit: string }
  location?: string
}

export class UpdateInventoryItemUseCase {
  constructor(
    private readonly items: IInventoryItemRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: UpdateInventoryItemInput): Promise<InventoryItemView> {
    const existing = await this.items.findById(input.id, input.householdId)
    if (!existing) {
      throw new ItemNotFoundError(input.id)
    }

    const now = this.clock()
    let updated = existing
    if (input.name !== undefined) {
      updated = updated.withName(input.name, now)
    }
    if (input.quantity !== undefined) {
      updated = updated.withQuantity(
        Quantity.fromUserInput(input.quantity.value, input.quantity.unit),
        now,
      )
    }
    if (input.location !== undefined) {
      updated = updated.withLocation(StorageLocation.fromString(input.location), now)
    }

    await this.items.save(updated)
    return toView(updated)
  }
}
