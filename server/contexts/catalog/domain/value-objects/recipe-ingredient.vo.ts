import { Quantity } from '../../../../../shared/units/quantity'

export const INGREDIENT_NAME_MAX_LENGTH = 120

export interface RecipeIngredientProps {
  name: string
  quantity: Quantity
}

export class RecipeIngredient {
  readonly name: string
  readonly quantity: Quantity

  private constructor(props: RecipeIngredientProps) {
    this.name = props.name
    this.quantity = props.quantity
  }

  static create(props: { name: string, quantity: Quantity }): RecipeIngredient {
    return new RecipeIngredient({
      name: RecipeIngredient.assertName(props.name),
      quantity: props.quantity,
    })
  }

  static rehydrate(props: RecipeIngredientProps): RecipeIngredient {
    return new RecipeIngredient(props)
  }

  /** Scale the quantity by a factor; returns a new ingredient. */
  scaled(factor: number): RecipeIngredient {
    if (!Number.isFinite(factor) || factor < 0) {
      throw new Error(`Scale factor must be a non-negative finite number (got ${factor}).`)
    }
    return new RecipeIngredient({
      name: this.name,
      quantity: Quantity.fromCanonical(this.quantity.value * factor, this.quantity.unit),
    })
  }

  private static assertName(rawName: string): string {
    const name = rawName.trim()
    if (name.length === 0) {
      throw new Error('Ingredient name must not be empty.')
    }
    if (name.length > INGREDIENT_NAME_MAX_LENGTH) {
      throw new Error(`Ingredient name must not exceed ${INGREDIENT_NAME_MAX_LENGTH} characters.`)
    }
    return name
  }
}
