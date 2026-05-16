import { Quantity } from '../../../../../shared/units/quantity'
import type { InventoryItemRow, NewInventoryItemRow } from '../../../../database/schema/inventory-items'
import { InventoryItem } from '../../domain/entities/inventory-item.entity'
import { StorageLocation } from '../../domain/value-objects/storage-location.vo'

export const InventoryItemMapper = {
  toDomain(row: InventoryItemRow): InventoryItem {
    return InventoryItem.rehydrate({
      id: row.id,
      householdId: row.householdId,
      ingredientId: row.ingredientId,
      quantity: Quantity.fromCanonical(row.quantityValue, row.quantityUnit),
      location: StorageLocation.fromString(row.location),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  },

  toPersistence(item: InventoryItem): NewInventoryItemRow {
    return {
      id: item.id,
      householdId: item.householdId,
      ingredientId: item.ingredientId,
      quantityValue: item.quantity.value,
      quantityUnit: item.quantity.unit,
      location: item.location.value,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }
  },
}
