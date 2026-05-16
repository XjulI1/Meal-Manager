import { CreateProductSchema } from '../../../../shared/dto/product'
import { DuplicateBarcodeError } from '../../../contexts/ingredients/domain/errors/duplicate-barcode.error'
import { IncompatiblePackUnitError } from '../../../contexts/ingredients/domain/errors/incompatible-pack-unit.error'
import { IngredientNotFoundError } from '../../../contexts/ingredients/domain/errors/ingredient-not-found.error'
import { InvalidBarcodeFormatError } from '../../../contexts/ingredients/domain/value-objects/barcode.vo'
import { requireHouseholdMember } from '../../../utils/require-household'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const ingredientId = getRouterParam(event, 'id')
  if (!ingredientId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing ingredient id.' })
  }
  const body = await readValidatedBody(event, (raw) => CreateProductSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid product payload.' })
  }

  try {
    setResponseStatus(event, 201)
    return await event.context.container.addProduct.execute({
      householdId,
      ingredientId,
      brand: body.data.brand,
      packSize: body.data.packSize,
      packUnit: body.data.packUnit,
      imageUrl: body.data.imageUrl,
      barcodes: body.data.barcodes,
    })
  }
  catch (error) {
    if (error instanceof IngredientNotFoundError) {
      throw createError({ statusCode: 404, statusMessage: 'Ingredient not found.' })
    }
    if (error instanceof DuplicateBarcodeError) {
      throw createError({ statusCode: 409, statusMessage: error.message })
    }
    if (error instanceof InvalidBarcodeFormatError || error instanceof IncompatiblePackUnitError) {
      throw createError({ statusCode: 400, statusMessage: error.message })
    }
    throw error
  }
})
