import { UpdateRecipeSchema } from '../../../shared/dto/recipes'
import { InvalidIngredientReferenceError } from '../../contexts/catalog/domain/errors/invalid-ingredient-reference.error'
import { RecipeNotFoundError } from '../../contexts/catalog/domain/errors/recipe-not-found.error'
import { requireHouseholdMember } from '../../utils/require-household'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing recipe id.' })
  }
  const body = await readValidatedBody(event, (raw) => UpdateRecipeSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid recipe payload.' })
  }

  try {
    return await event.context.container.updateRecipe.execute({
      householdId,
      id,
      title: body.data.title,
      instructions: body.data.instructions,
      servings: body.data.servings,
      ingredients: body.data.ingredients,
    })
  }
  catch (error) {
    if (error instanceof RecipeNotFoundError) {
      throw createError({ statusCode: 404, statusMessage: 'Recipe not found.' })
    }
    if (error instanceof InvalidIngredientReferenceError) {
      throw createError({ statusCode: 400, statusMessage: error.message })
    }
    throw error
  }
})
