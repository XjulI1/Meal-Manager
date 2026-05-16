import type { Quantity } from '../../../../../shared/units/quantity'

export interface ShoppingListItemProps {
  id: string
  ingredientId: string
  /** Denormalized snapshot of the ingredient name at generation time. */
  ingredientName: string
  /** Denormalized snapshot of the ingredient category at generation time. */
  category: string
  quantity: Quantity
  isChecked: boolean
}

export class ShoppingListItem {
  readonly id: string
  readonly ingredientId: string
  readonly ingredientName: string
  readonly category: string
  readonly quantity: Quantity
  readonly isChecked: boolean

  private constructor(props: ShoppingListItemProps) {
    this.id = props.id
    this.ingredientId = props.ingredientId
    this.ingredientName = props.ingredientName
    this.category = props.category
    this.quantity = props.quantity
    this.isChecked = props.isChecked
  }

  static create(props: {
    id: string
    ingredientId: string
    ingredientName: string
    category: string
    quantity: Quantity
  }): ShoppingListItem {
    return new ShoppingListItem({
      id: props.id,
      ingredientId: props.ingredientId,
      ingredientName: props.ingredientName,
      category: props.category,
      quantity: props.quantity,
      isChecked: false,
    })
  }

  static rehydrate(props: ShoppingListItemProps): ShoppingListItem {
    return new ShoppingListItem(props)
  }

  withChecked(isChecked: boolean): ShoppingListItem {
    return new ShoppingListItem({ ...this.toProps(), isChecked })
  }

  private toProps(): ShoppingListItemProps {
    return {
      id: this.id,
      ingredientId: this.ingredientId,
      ingredientName: this.ingredientName,
      category: this.category,
      quantity: this.quantity,
      isChecked: this.isChecked,
    }
  }
}
