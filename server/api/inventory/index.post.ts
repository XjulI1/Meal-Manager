import { CreateInventoryItemSchema } from '../../../shared/dto/inventory'
import { InvalidIngredientReferenceError } from '../../contexts/inventory/domain/errors/invalid-ingredient-reference.error'
import { requireHouseholdMember } from '../../utils/require-household'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const body = await readValidatedBody(event, (raw) => CreateInventoryItemSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid inventory payload.' })
  }

  try {
    setResponseStatus(event, 201)
    return await event.context.container.addInventoryItem.execute({
      householdId,
      ingredientId: body.data.ingredientId,
      quantity: body.data.quantity,
      location: body.data.location,
    })
  }
  catch (error) {
    if (error instanceof InvalidIngredientReferenceError) {
      throw createError({ statusCode: 400, statusMessage: error.message })
    }
    throw error
  }
})
