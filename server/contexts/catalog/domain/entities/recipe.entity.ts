import type { RecipeIngredient } from '../value-objects/recipe-ingredient.vo'

export const RECIPE_TITLE_MAX_LENGTH = 200
export const RECIPE_INSTRUCTIONS_MAX_LENGTH = 10_000
export const RECIPE_SERVINGS_MIN = 1
export const RECIPE_SERVINGS_MAX = 50
export const RECIPE_INGREDIENTS_MIN = 1
export const RECIPE_INGREDIENTS_MAX = 100

export interface RecipeProps {
  id: string
  householdId: string
  title: string
  instructions: string
  servings: number
  ingredients: ReadonlyArray<RecipeIngredient>
  createdAt: Date
  updatedAt: Date
}

export class Recipe {
  readonly id: string
  readonly householdId: string
  readonly title: string
  readonly instructions: string
  readonly servings: number
  readonly ingredients: ReadonlyArray<RecipeIngredient>
  readonly createdAt: Date
  readonly updatedAt: Date

  private constructor(props: RecipeProps) {
    this.id = props.id
    this.householdId = props.householdId
    this.title = props.title
    this.instructions = props.instructions
    this.servings = props.servings
    this.ingredients = props.ingredients
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }

  static create(props: {
    id: string
    householdId: string
    title: string
    instructions: string
    servings: number
    ingredients: ReadonlyArray<RecipeIngredient>
    now?: Date
  }): Recipe {
    const now = props.now ?? new Date()
    return new Recipe({
      id: props.id,
      householdId: props.householdId,
      title: Recipe.assertTitle(props.title),
      instructions: Recipe.assertInstructions(props.instructions),
      servings: Recipe.assertServings(props.servings),
      ingredients: Recipe.assertIngredients(props.ingredients),
      createdAt: now,
      updatedAt: now,
    })
  }

  static rehydrate(props: RecipeProps): Recipe {
    return new Recipe(props)
  }

  withTitle(title: string, now: Date = new Date()): Recipe {
    return new Recipe({ ...this.props(), title: Recipe.assertTitle(title), updatedAt: now })
  }

  withInstructions(instructions: string, now: Date = new Date()): Recipe {
    return new Recipe({ ...this.props(), instructions: Recipe.assertInstructions(instructions), updatedAt: now })
  }

  withServings(servings: number, now: Date = new Date()): Recipe {
    return new Recipe({ ...this.props(), servings: Recipe.assertServings(servings), updatedAt: now })
  }

  withIngredients(ingredients: ReadonlyArray<RecipeIngredient>, now: Date = new Date()): Recipe {
    return new Recipe({ ...this.props(), ingredients: Recipe.assertIngredients(ingredients), updatedAt: now })
  }

  private props(): RecipeProps {
    return {
      id: this.id,
      householdId: this.householdId,
      title: this.title,
      instructions: this.instructions,
      servings: this.servings,
      ingredients: this.ingredients,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }

  private static assertTitle(rawTitle: string): string {
    const title = rawTitle.trim()
    if (title.length === 0) {
      throw new Error('Recipe title must not be empty.')
    }
    if (title.length > RECIPE_TITLE_MAX_LENGTH) {
      throw new Error(`Recipe title must not exceed ${RECIPE_TITLE_MAX_LENGTH} characters.`)
    }
    return title
  }

  private static assertInstructions(instructions: string): string {
    if (instructions.length === 0) {
      throw new Error('Recipe instructions must not be empty.')
    }
    if (instructions.length > RECIPE_INSTRUCTIONS_MAX_LENGTH) {
      throw new Error(`Recipe instructions must not exceed ${RECIPE_INSTRUCTIONS_MAX_LENGTH} characters.`)
    }
    return instructions
  }

  private static assertServings(servings: number): number {
    if (!Number.isInteger(servings) || servings < RECIPE_SERVINGS_MIN || servings > RECIPE_SERVINGS_MAX) {
      throw new Error(`Recipe servings must be an integer between ${RECIPE_SERVINGS_MIN} and ${RECIPE_SERVINGS_MAX} (got ${servings}).`)
    }
    return servings
  }

  private static assertIngredients(ingredients: ReadonlyArray<RecipeIngredient>): ReadonlyArray<RecipeIngredient> {
    if (ingredients.length < RECIPE_INGREDIENTS_MIN) {
      throw new Error(`Recipe must have at least ${RECIPE_INGREDIENTS_MIN} ingredient.`)
    }
    if (ingredients.length > RECIPE_INGREDIENTS_MAX) {
      throw new Error(`Recipe must not exceed ${RECIPE_INGREDIENTS_MAX} ingredients.`)
    }
    return ingredients
  }
}
