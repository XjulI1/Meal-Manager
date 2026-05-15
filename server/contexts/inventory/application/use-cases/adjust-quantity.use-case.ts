import { Quantity } from '../../../../../shared/units/quantity'
import { ItemNotFoundError } from '../../domain/errors/item-not-found.error'
import type { IInventoryItemRepository } from '../../domain/ports/inventory-item-repository.port'
import { toView, type InventoryItemView } from './add-inventory-item.use-case'

export interface AdjustQuantityInput {
  householdId: string
  id: string
  /**
   * Signed delta in the given unit. Positive increments, negative decrements.
   * Decrements clamp to zero (the item is removed when reaching zero).
   */
  delta: { value: number, unit: string }
}

export type AdjustQuantityResult =
  | { removed: false, item: InventoryItemView }
  | { removed: true, id: string }

export class AdjustQuantityUseCase {
  constructor(
    private readonly items: IInventoryItemRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: AdjustQuantityInput): Promise<AdjustQuantityResult> {
    const existing = await this.items.findById(input.id, input.householdId)
    if (!existing) {
      throw new ItemNotFoundError(input.id)
    }

    const magnitude = Math.abs(input.delta.value)
    const deltaQty = Quantity.fromUserInput(magnitude, input.delta.unit)
    const newQuantity = input.delta.value >= 0
      ? existing.quantity.add(deltaQty)
      : existing.quantity.subtractClamped(deltaQty)

    if (newQuantity.isZero()) {
      await this.items.delete(input.id, input.householdId)
      return { removed: true, id: input.id }
    }

    const updated = existing.withQuantity(newQuantity, this.clock())
    await this.items.save(updated)
    return { removed: false, item: toView(updated) }
  }
}
