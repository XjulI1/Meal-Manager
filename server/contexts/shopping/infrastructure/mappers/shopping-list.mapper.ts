import { Quantity } from '../../../../../shared/units/quantity'
import type {
  NewShoppingListItemRow,
  NewShoppingListSnapshotRow,
  ShoppingListItemRow,
  ShoppingListSnapshotRow,
} from '../../../../database/schema/shopping-lists'
import { ShoppingListItem } from '../../domain/entities/shopping-list-item.entity'
import { ShoppingListSnapshot } from '../../domain/entities/shopping-list-snapshot.entity'

export const ShoppingListMapper = {
  toDomain(
    row: ShoppingListSnapshotRow,
    itemRows: ReadonlyArray<ShoppingListItemRow>,
  ): ShoppingListSnapshot {
    const items = itemRows.map((r) =>
      ShoppingListItem.rehydrate({
        id: r.id,
        ingredientId: r.ingredientId,
        ingredientName: r.ingredientName,
        category: r.category,
        quantity: Quantity.fromCanonical(r.quantityValue, r.quantityUnit),
        isChecked: r.isChecked,
      }),
    )
    return ShoppingListSnapshot.rehydrate({
      id: row.id,
      householdId: row.householdId,
      menuId: row.menuId,
      generatedAt: row.generatedAt,
      items,
    })
  },

  snapshotToPersistence(snapshot: ShoppingListSnapshot): NewShoppingListSnapshotRow {
    return {
      id: snapshot.id,
      householdId: snapshot.householdId,
      menuId: snapshot.menuId,
      generatedAt: snapshot.generatedAt,
    }
  },

  itemsToPersistence(snapshot: ShoppingListSnapshot): NewShoppingListItemRow[] {
    return snapshot.items.map((item) => ({
      id: item.id,
      snapshotId: snapshot.id,
      ingredientId: item.ingredientId,
      ingredientName: item.ingredientName,
      category: item.category as NewShoppingListItemRow['category'],
      quantityValue: item.quantity.value,
      quantityUnit: item.quantity.unit,
      isChecked: item.isChecked,
    }))
  },
}
