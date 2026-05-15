import { CreateRecipeSchema } from '../../../shared/dto/recipes'
import { requireHouseholdMember } from '../../utils/require-household'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const body = await readValidatedBody(event, (raw) => CreateRecipeSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid recipe payload.' })
  }

  setResponseStatus(event, 201)
  return event.context.container.createRecipe.execute({
    householdId,
    title: body.data.title,
    instructions: body.data.instructions,
    servings: body.data.servings,
    ingredients: body.data.ingredients,
  })
})
