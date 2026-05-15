import { ShoppingListNotFoundError } from '../../domain/errors/shopping-list-not-found.error'
import type { IShoppingListRepository } from '../../domain/ports/shopping-list-repository.port'
import { toShoppingListView, type ShoppingListView } from './generate-shopping-list.use-case'

export interface GetShoppingListByMenuInput {
  householdId: string
  menuId: string
}

export class GetShoppingListByMenuUseCase {
  constructor(private readonly snapshots: IShoppingListRepository) {}

  async execute(input: GetShoppingListByMenuInput): Promise<ShoppingListView> {
    const snapshot = await this.snapshots.findByMenu(input.menuId, input.householdId)
    if (!snapshot) {
      throw new ShoppingListNotFoundError()
    }
    return toShoppingListView(snapshot)
  }
}
