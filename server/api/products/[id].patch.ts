import { UpdateProductSchema } from '../../../shared/dto/product'
import { DuplicateBarcodeError } from '../../contexts/ingredients/domain/errors/duplicate-barcode.error'
import { ProductNotFoundError } from '../../contexts/ingredients/domain/errors/product-not-found.error'
import { InvalidBarcodeFormatError } from '../../contexts/ingredients/domain/value-objects/barcode.vo'
import { requireHouseholdMember } from '../../utils/require-household'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing product id.' })
  }
  const body = await readValidatedBody(event, (raw) => UpdateProductSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid product payload.' })
  }

  try {
    return await event.context.container.updateProduct.execute({
      householdId,
      id,
      brand: body.data.brand,
      packSize: body.data.packSize,
      imageUrl: body.data.imageUrl,
      barcodes: body.data.barcodes,
    })
  }
  catch (error) {
    if (error instanceof ProductNotFoundError) {
      throw createError({ statusCode: 404, statusMessage: 'Product not found.' })
    }
    if (error instanceof DuplicateBarcodeError) {
      throw createError({ statusCode: 409, statusMessage: error.message })
    }
    if (error instanceof InvalidBarcodeFormatError) {
      throw createError({ statusCode: 400, statusMessage: error.message })
    }
    throw error
  }
})
