import { randomUUID } from 'node:crypto'
import { Quantity } from '../../../../../shared/units/quantity'
import { InventoryItem } from '../../domain/entities/inventory-item.entity'
import type { IInventoryItemRepository } from '../../domain/ports/inventory-item-repository.port'
import { StorageLocation } from '../../domain/value-objects/storage-location.vo'

export interface AddInventoryItemInput {
  householdId: string
  name: string
  quantity: { value: number, unit: string }
  location: string
}

export interface InventoryItemView {
  id: string
  name: string
  quantity: { value: number, unit: string }
  location: 'pantry' | 'fridge'
  updatedAt: string
}

export class AddInventoryItemUseCase {
  constructor(
    private readonly items: IInventoryItemRepository,
    private readonly idGenerator: () => string = randomUUID,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: AddInventoryItemInput): Promise<InventoryItemView> {
    const now = this.clock()
    const item = InventoryItem.create({
      id: this.idGenerator(),
      householdId: input.householdId,
      name: input.name,
      quantity: Quantity.fromUserInput(input.quantity.value, input.quantity.unit),
      location: StorageLocation.fromString(input.location),
      now,
    })
    await this.items.save(item)
    return toView(item)
  }
}

export function toView(item: InventoryItem): InventoryItemView {
  return {
    id: item.id,
    name: item.name,
    quantity: { value: item.quantity.value, unit: item.quantity.unit },
    location: item.location.value,
    updatedAt: item.updatedAt.toISOString(),
  }
}
