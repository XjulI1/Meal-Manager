import { CreateIngredientSchema } from '../../../shared/dto/ingredient'
import { DuplicateIngredientNameError } from '../../contexts/ingredients/domain/errors/duplicate-ingredient-name.error'
import { requireHouseholdMember } from '../../utils/require-household'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const body = await readValidatedBody(event, (raw) => CreateIngredientSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid ingredient payload.' })
  }

  try {
    setResponseStatus(event, 201)
    return await event.context.container.createIngredient.execute({
      householdId,
      name: body.data.name,
      storage: body.data.storage,
      category: body.data.category,
      canonicalUnit: body.data.canonicalUnit,
      shelfLifeDays: body.data.shelfLifeDays,
      imageUrl: body.data.imageUrl,
      defaultPackSize: body.data.defaultPackSize,
      allergens: body.data.allergens,
      aliases: body.data.aliases,
    })
  }
  catch (error) {
    if (error instanceof DuplicateIngredientNameError) {
      throw createError({ statusCode: 409, statusMessage: error.message })
    }
    throw error
  }
})
