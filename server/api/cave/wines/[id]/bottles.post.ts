import { AddBottlesSchema } from '../../../../../shared/dto/wine-cellar'
import { requireHouseholdMember } from '../../../../utils/require-household'
import { handleWineCellarError } from '../../../../utils/wine-cellar-http'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const wineId = getRouterParam(event, 'id')
  if (!wineId) throw createError({ statusCode: 400, statusMessage: 'Identifiant de vin manquant.' })

  const body = await readValidatedBody(event, (raw) => AddBottlesSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Bouteilles invalides.' })
  }

  try {
    const result = await event.context.container.addBottles.execute({
      householdId,
      wineId,
      quantity: body.data.quantity,
      size: body.data.size,
      buyingPrice: body.data.buyingPrice,
      addedDate: body.data.addedDate,
    })
    setResponseStatus(event, 201)
    return result
  }
  catch (error) {
    handleWineCellarError(error)
  }
})
