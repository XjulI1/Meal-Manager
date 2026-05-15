import type { ShoppingListItem } from './shopping-list-item.entity'

export interface ShoppingListSnapshotProps {
  id: string
  householdId: string
  menuId: string
  generatedAt: Date
  items: ReadonlyArray<ShoppingListItem>
}

export class ShoppingListSnapshot {
  readonly id: string
  readonly householdId: string
  readonly menuId: string
  readonly generatedAt: Date
  readonly items: ReadonlyArray<ShoppingListItem>

  private constructor(props: ShoppingListSnapshotProps) {
    this.id = props.id
    this.householdId = props.householdId
    this.menuId = props.menuId
    this.generatedAt = props.generatedAt
    this.items = props.items
  }

  static create(props: {
    id: string
    householdId: string
    menuId: string
    items: ReadonlyArray<ShoppingListItem>
    now?: Date
  }): ShoppingListSnapshot {
    return new ShoppingListSnapshot({
      id: props.id,
      householdId: props.householdId,
      menuId: props.menuId,
      generatedAt: props.now ?? new Date(),
      items: props.items,
    })
  }

  static rehydrate(props: ShoppingListSnapshotProps): ShoppingListSnapshot {
    return new ShoppingListSnapshot(props)
  }

  findItem(itemId: string): ShoppingListItem | undefined {
    return this.items.find((i) => i.id === itemId)
  }
}
