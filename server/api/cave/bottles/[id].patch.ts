import { UpdateBottleSchema } from '../../../../shared/dto/wine-cellar'
import { requireHouseholdMember } from '../../../utils/require-household'
import { handleWineCellarError } from '../../../utils/wine-cellar-http'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Identifiant de bouteille manquant.' })

  const body = await readValidatedBody(event, (raw) => UpdateBottleSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Bouteille invalide.' })
  }

  try {
    return await event.context.container.updateBottle.execute({
      householdId,
      id,
      size: body.data.size,
      buyingPrice: body.data.buyingPrice,
      addedDate: body.data.addedDate,
    })
  }
  catch (error) {
    handleWineCellarError(error)
  }
})
