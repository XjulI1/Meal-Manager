import { Quantity } from '../../../../../shared/units/quantity'

export interface RecipeIngredientProps {
  ingredientId: string
  quantity: Quantity
}

export class RecipeIngredient {
  readonly ingredientId: string
  readonly quantity: Quantity

  private constructor(props: RecipeIngredientProps) {
    this.ingredientId = props.ingredientId
    this.quantity = props.quantity
  }

  static create(props: { ingredientId: string, quantity: Quantity }): RecipeIngredient {
    return new RecipeIngredient({
      ingredientId: RecipeIngredient.assertId(props.ingredientId),
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
      ingredientId: this.ingredientId,
      quantity: Quantity.fromCanonical(this.quantity.value * factor, this.quantity.unit),
    })
  }

  private static assertId(raw: string): string {
    const id = raw.trim()
    if (id.length === 0) {
      throw new Error('Recipe ingredient must reference an ingredientId.')
    }
    return id
  }
}
