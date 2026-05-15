import { ShoppingListSnapshot } from '../../../../server/contexts/shopping/domain/entities/shopping-list-snapshot.entity'
import type { IShoppingListRepository } from '../../../../server/contexts/shopping/domain/ports/shopping-list-repository.port'

export class InMemoryShoppingListRepository implements IShoppingListRepository {
  private readonly snapshots = new Map<string, ShoppingListSnapshot>()

  async findByMenu(menuId: string, householdId: string): Promise<ShoppingListSnapshot | null> {
    for (const s of this.snapshots.values()) {
      if (s.menuId === menuId && s.householdId === householdId) return s
    }
    return null
  }

  async findById(snapshotId: string, householdId: string): Promise<ShoppingListSnapshot | null> {
    const s = this.snapshots.get(snapshotId)
    if (!s || s.householdId !== householdId) return null
    return s
  }

  async replaceForMenu(snapshot: ShoppingListSnapshot): Promise<void> {
    for (const [id, s] of this.snapshots.entries()) {
      if (s.menuId === snapshot.menuId && s.householdId === snapshot.householdId) {
        this.snapshots.delete(id)
      }
    }
    this.snapshots.set(snapshot.id, snapshot)
  }

  async setItemChecked(snapshotId: string, itemId: string, isChecked: boolean): Promise<void> {
    const s = this.snapshots.get(snapshotId)
    if (!s) return
    const items = s.items.map((i) => (i.id === itemId ? i.withChecked(isChecked) : i))
    this.snapshots.set(snapshotId, ShoppingListSnapshot.rehydrate({
      id: s.id,
      householdId: s.householdId,
      menuId: s.menuId,
      generatedAt: s.generatedAt,
      items,
    }))
  }
}
