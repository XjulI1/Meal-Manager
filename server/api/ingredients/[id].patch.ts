import { UpdateIngredientSchema } from '../../../shared/dto/ingredient'
import { CanonicalUnitLockedError } from '../../contexts/ingredients/domain/errors/canonical-unit-locked.error'
import { DuplicateIngredientNameError } from '../../contexts/ingredients/domain/errors/duplicate-ingredient-name.error'
import { IngredientNotFoundError } from '../../contexts/ingredients/domain/errors/ingredient-not-found.error'
import { requireHouseholdMember } from '../../utils/require-household'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing ingredient id.' })
  }
  const body = await readValidatedBody(event, (raw) => UpdateIngredientSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid ingredient payload.' })
  }

  try {
    return await event.context.container.updateIngredient.execute({
      householdId,
      id,
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
    if (error instanceof IngredientNotFoundError) {
      throw createError({ statusCode: 404, statusMessage: 'Ingredient not found.' })
    }
    if (error instanceof DuplicateIngredientNameError) {
      throw createError({ statusCode: 409, statusMessage: error.message })
    }
    if (error instanceof CanonicalUnitLockedError) {
      throw createError({ statusCode: 409, statusMessage: error.message })
    }
    throw error
  }
})
