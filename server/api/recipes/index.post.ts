import { CreateRecipeSchema } from '../../../shared/dto/recipes'
import { InvalidIngredientReferenceError } from '../../contexts/catalog/domain/errors/invalid-ingredient-reference.error'
import { requireHouseholdMember } from '../../utils/require-household'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const body = await readValidatedBody(event, (raw) => CreateRecipeSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid recipe payload.' })
  }

  try {
    setResponseStatus(event, 201)
    return await event.context.container.createRecipe.execute({
      householdId,
      title: body.data.title,
      instructions: body.data.instructions,
      servings: body.data.servings,
      ingredients: body.data.ingredients,
    })
  }
  catch (error) {
    if (error instanceof InvalidIngredientReferenceError) {
      throw createError({ statusCode: 400, statusMessage: error.message })
    }
    throw error
  }
})
