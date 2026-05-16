import { InvalidBarcodeFormatError } from '../../contexts/ingredients/domain/value-objects/barcode.vo'
import { requireHouseholdMember } from '../../utils/require-household'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const code = getRouterParam(event, 'code')
  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'Missing barcode.' })
  }

  try {
    const resolved = await event.context.container.resolveByBarcode.execute({ householdId, barcode: code })
    if (!resolved) {
      throw createError({ statusCode: 404, statusMessage: 'Barcode not found in your catalog.' })
    }
    return resolved
  }
  catch (error) {
    if (error instanceof InvalidBarcodeFormatError) {
      throw createError({ statusCode: 400, statusMessage: error.message })
    }
    throw error
  }
})
