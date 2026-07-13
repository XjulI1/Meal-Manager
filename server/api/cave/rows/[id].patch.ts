import { UpdateRowSchema } from '../../../../shared/dto/wine-cellar'
import { requireHouseholdMember } from '../../../utils/require-household'
import { handleWineCellarError } from '../../../utils/wine-cellar-http'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Identifiant d\'étage manquant.' })

  const body = await readValidatedBody(event, (raw) => UpdateRowSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Étage invalide.' })
  }

  try {
    return await event.context.container.updateRow.execute({
      householdId,
      id,
      position: body.data.position,
      capacityBack: body.data.capacityBack,
      capacityFront: body.data.capacityFront,
    })
  }
  catch (error) {
    handleWineCellarError(error)
  }
})
