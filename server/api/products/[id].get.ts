import { ProductNotFoundError } from '../../contexts/ingredients/domain/errors/product-not-found.error'
import { requireHouseholdMember } from '../../utils/require-household'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing product id.' })
  }

  try {
    return await event.context.container.getProduct.execute({ householdId, id })
  }
  catch (error) {
    if (error instanceof ProductNotFoundError) {
      throw createError({ statusCode: 404, statusMessage: 'Product not found.' })
    }
    throw error
  }
})
