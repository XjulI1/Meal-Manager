import { and, eq } from 'drizzle-orm'
import type { Database } from '../../../../database/client'
import {
  shoppingListItems,
  shoppingListSnapshots,
} from '../../../../database/schema/shopping-lists'
import type { ShoppingListSnapshot } from '../../domain/entities/shopping-list-snapshot.entity'
import type { IShoppingListRepository } from '../../domain/ports/shopping-list-repository.port'
import { ShoppingListMapper } from '../mappers/shopping-list.mapper'

export class DrizzleShoppingListRepository implements IShoppingListRepository {
  constructor(private readonly db: Database) {}

  async findByMenu(menuId: string, householdId: string): Promise<ShoppingListSnapshot | null> {
    const rows = await this.db
      .select()
      .from(shoppingListSnapshots)
      .where(and(eq(shoppingListSnapshots.menuId, menuId), eq(shoppingListSnapshots.householdId, householdId)))
      .limit(1)
    const row = rows[0]
    if (!row) return null
    const itemRows = await this.db
      .select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.snapshotId, row.id))
    return ShoppingListMapper.toDomain(row, itemRows)
  }

  async findById(snapshotId: string, householdId: string): Promise<ShoppingListSnapshot | null> {
    const rows = await this.db
      .select()
      .from(shoppingListSnapshots)
      .where(and(eq(shoppingListSnapshots.id, snapshotId), eq(shoppingListSnapshots.householdId, householdId)))
      .limit(1)
    const row = rows[0]
    if (!row) return null
    const itemRows = await this.db
      .select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.snapshotId, row.id))
    return ShoppingListMapper.toDomain(row, itemRows)
  }

  async replaceForMenu(snapshot: ShoppingListSnapshot): Promise<void> {
    await this.db.transaction(async (tx) => {
      // FK on shopping_list_items → cascade on delete; dropping snapshots is enough.
      await tx
        .delete(shoppingListSnapshots)
        .where(and(
          eq(shoppingListSnapshots.menuId, snapshot.menuId),
          eq(shoppingListSnapshots.householdId, snapshot.householdId),
        ))

      await tx.insert(shoppingListSnapshots).values(ShoppingListMapper.snapshotToPersistence(snapshot))
      const itemRows = ShoppingListMapper.itemsToPersistence(snapshot)
      if (itemRows.length > 0) {
        await tx.insert(shoppingListItems).values(itemRows)
      }
    })
  }

  async setItemChecked(snapshotId: string, itemId: string, isChecked: boolean): Promise<void> {
    await this.db
      .update(shoppingListItems)
      .set({ isChecked })
      .where(and(eq(shoppingListItems.id, itemId), eq(shoppingListItems.snapshotId, snapshotId)))
  }
}
