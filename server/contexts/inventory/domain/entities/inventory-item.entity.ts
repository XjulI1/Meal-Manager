import type { Quantity } from '../../../../../shared/units/quantity'
import type { StorageLocation } from '../value-objects/storage-location.vo'

export interface InventoryItemProps {
  id: string
  householdId: string
  ingredientId: string
  quantity: Quantity
  location: StorageLocation
  createdAt: Date
  updatedAt: Date
}

export class InventoryItem {
  readonly id: string
  readonly householdId: string
  readonly ingredientId: string
  readonly quantity: Quantity
  readonly location: StorageLocation
  readonly createdAt: Date
  readonly updatedAt: Date

  private constructor(props: InventoryItemProps) {
    this.id = props.id
    this.householdId = props.householdId
    this.ingredientId = props.ingredientId
    this.quantity = props.quantity
    this.location = props.location
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }

  static create(props: {
    id: string
    householdId: string
    ingredientId: string
    quantity: Quantity
    location: StorageLocation
    now?: Date
  }): InventoryItem {
    const now = props.now ?? new Date()
    return new InventoryItem({
      id: props.id,
      householdId: props.householdId,
      ingredientId: props.ingredientId,
      quantity: props.quantity,
      location: props.location,
      createdAt: now,
      updatedAt: now,
    })
  }

  static rehydrate(props: InventoryItemProps): InventoryItem {
    return new InventoryItem(props)
  }

  withQuantity(quantity: Quantity, now: Date = new Date()): InventoryItem {
    return new InventoryItem({ ...this.props(), quantity, updatedAt: now })
  }

  withLocation(location: StorageLocation, now: Date = new Date()): InventoryItem {
    return new InventoryItem({ ...this.props(), location, updatedAt: now })
  }

  private props(): InventoryItemProps {
    return {
      id: this.id,
      householdId: this.householdId,
      ingredientId: this.ingredientId,
      quantity: this.quantity,
      location: this.location,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}
