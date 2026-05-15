import type { Quantity } from '../../../../../shared/units/quantity'

export interface ShoppingListItemProps {
  id: string
  ingredientName: string
  quantity: Quantity
  isChecked: boolean
}

export class ShoppingListItem {
  readonly id: string
  readonly ingredientName: string
  readonly quantity: Quantity
  readonly isChecked: boolean

  private constructor(props: ShoppingListItemProps) {
    this.id = props.id
    this.ingredientName = props.ingredientName
    this.quantity = props.quantity
    this.isChecked = props.isChecked
  }

  static create(props: { id: string, ingredientName: string, quantity: Quantity }): ShoppingListItem {
    return new ShoppingListItem({
      id: props.id,
      ingredientName: props.ingredientName,
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
      ingredientName: this.ingredientName,
      quantity: this.quantity,
      isChecked: this.isChecked,
    }
  }
}
