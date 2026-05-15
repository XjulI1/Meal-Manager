import type { ShoppingListSnapshot } from '../entities/shopping-list-snapshot.entity'

export interface IShoppingListRepository {
  findByMenu(menuId: string, householdId: string): Promise<ShoppingListSnapshot | null>
  findById(snapshotId: string, householdId: string): Promise<ShoppingListSnapshot | null>

  /** Replaces any existing snapshot for the menu (deletes the previous one). */
  replaceForMenu(snapshot: ShoppingListSnapshot): Promise<void>

  /** Atomically update the checked state of a single item. */
  setItemChecked(snapshotId: string, itemId: string, isChecked: boolean): Promise<void>
}
