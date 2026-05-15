import type { Quantity } from '../../../../../shared/units/quantity'

export interface InventorySnapshotItem {
  name: string
  quantity: Quantity
}

/**
 * Narrow port the shopping context uses to read the current stock without
 * depending on the inventory aggregate or its persistence layer.
 */
export interface IInventorySnapshotFinder {
  listForHousehold(householdId: string): Promise<InventorySnapshotItem[]>
}
