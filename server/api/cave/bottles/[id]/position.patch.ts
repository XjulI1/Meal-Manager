import { PlaceBottleSchema } from '../../../../../shared/dto/wine-cellar'
import { requireHouseholdMember } from '../../../../utils/require-household'
import { handleWineCellarError } from '../../../../utils/wine-cellar-http'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const bottleId = getRouterParam(event, 'id')
  if (!bottleId) throw createError({ statusCode: 400, statusMessage: 'Identifiant de bouteille manquant.' })

  const body = await readValidatedBody(event, (raw) => PlaceBottleSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Emplacement invalide.' })
  }

  try {
    return await event.context.container.placeBottle.execute({
      householdId,
      bottleId,
      position: body.data.position,
    })
  }
  catch (error) {
    handleWineCellarError(error)
  }
})
