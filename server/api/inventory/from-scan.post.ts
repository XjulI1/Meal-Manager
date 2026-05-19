import { AddFromScanSchema } from '../../../shared/dto/scan.dto'
import { InvalidIngredientReferenceError } from '../../contexts/inventory/domain/errors/invalid-ingredient-reference.error'
import { ProductNotFoundError } from '../../contexts/inventory/domain/errors/product-not-found.error'
import { requireHouseholdMember } from '../../utils/require-household'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const body = await readValidatedBody(event, (raw) => AddFromScanSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid scan payload.' })
  }

  try {
    const result = await event.context.container.addInventoryItemFromProductScan.execute({
      householdId,
      productId: body.data.productId,
      quantity: body.data.quantity,
      location: body.data.location,
    })
    setResponseStatus(event, result.created ? 201 : 200)
    return result
  }
  catch (error) {
    if (error instanceof ProductNotFoundError) {
      throw createError({ statusCode: 404, statusMessage: 'Product not found in your catalog.' })
    }
    if (error instanceof InvalidIngredientReferenceError) {
      throw createError({ statusCode: 400, statusMessage: error.message })
    }
    throw error
  }
})
