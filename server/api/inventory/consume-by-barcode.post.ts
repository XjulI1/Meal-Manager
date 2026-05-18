import { ConsumeByBarcodeSchema } from '../../../shared/dto/scan.dto'
import { InsufficientQuantityError } from '../../contexts/inventory/domain/errors/insufficient-quantity.error'
import { InvalidIngredientReferenceError } from '../../contexts/inventory/domain/errors/invalid-ingredient-reference.error'
import { ItemNotFoundError } from '../../contexts/inventory/domain/errors/item-not-found.error'
import { InvalidBarcodeFormatError } from '../../contexts/ingredients/domain/value-objects/barcode.vo'
import { requireHouseholdMember } from '../../utils/require-household'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const body = await readValidatedBody(event, (raw) => ConsumeByBarcodeSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid consume payload.' })
  }

  try {
    const result = await event.context.container.consumeInventoryItemByBarcode.execute({
      householdId,
      barcode: body.data.barcode,
      quantity: body.data.quantity,
      preview: body.data.preview,
    })
    if (result.mode === 'preview') {
      return {
        candidates: result.candidates,
        totalAvailable: result.totalAvailable,
        fullyConsumed: result.fullyConsumed,
      }
    }
    return { impactedLines: result.impactedLines }
  }
  catch (error) {
    if (error instanceof ItemNotFoundError) {
      throw createError({ statusCode: 404, statusMessage: 'Barcode not found in your catalog.' })
    }
    if (error instanceof InvalidBarcodeFormatError) {
      throw createError({ statusCode: 400, statusMessage: error.message })
    }
    if (error instanceof InsufficientQuantityError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Requested quantity exceeds available inventory.',
        data: {
          error: 'insufficient-quantity',
          requested: error.requested,
          available: error.available,
          unit: error.unit,
        },
      })
    }
    if (error instanceof InvalidIngredientReferenceError) {
      throw createError({ statusCode: 400, statusMessage: error.message })
    }
    throw error
  }
})
