import {
  ShoppingListItemNotFoundError,
  ShoppingListNotFoundError,
} from '../../domain/errors/shopping-list-not-found.error'
import type { IShoppingListRepository } from '../../domain/ports/shopping-list-repository.port'
import { toShoppingListView, type ShoppingListView } from './generate-shopping-list.use-case'

export interface ToggleShoppingListItemInput {
  householdId: string
  snapshotId: string
  itemId: string
  isChecked: boolean
}

export class ToggleShoppingListItemUseCase {
  constructor(private readonly snapshots: IShoppingListRepository) {}

  async execute(input: ToggleShoppingListItemInput): Promise<ShoppingListView> {
    const snapshot = await this.snapshots.findById(input.snapshotId, input.householdId)
    if (!snapshot) {
      throw new ShoppingListNotFoundError()
    }
    const item = snapshot.findItem(input.itemId)
    if (!item) {
      throw new ShoppingListItemNotFoundError(input.itemId)
    }

    await this.snapshots.setItemChecked(snapshot.id, item.id, input.isChecked)

    const refreshed = await this.snapshots.findById(input.snapshotId, input.householdId)
    if (!refreshed) {
      throw new ShoppingListNotFoundError()
    }
    return toShoppingListView(refreshed)
  }
}
