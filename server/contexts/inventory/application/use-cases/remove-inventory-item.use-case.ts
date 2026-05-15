import { ItemNotFoundError } from '../../domain/errors/item-not-found.error'
import type { IInventoryItemRepository } from '../../domain/ports/inventory-item-repository.port'

export interface RemoveInventoryItemInput {
  householdId: string
  id: string
}

export class RemoveInventoryItemUseCase {
  constructor(private readonly items: IInventoryItemRepository) {}

  async execute(input: RemoveInventoryItemInput): Promise<void> {
    const existing = await this.items.findById(input.id, input.householdId)
    if (!existing) {
      throw new ItemNotFoundError(input.id)
    }
    await this.items.delete(input.id, input.householdId)
  }
}
