import { AddRowSchema } from '../../../../../shared/dto/wine-cellar'
import { requireHouseholdMember } from '../../../../utils/require-household'
import { handleWineCellarError } from '../../../../utils/wine-cellar-http'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const shelfId = getRouterParam(event, 'id')
  if (!shelfId) throw createError({ statusCode: 400, statusMessage: 'Identifiant de clayette manquant.' })

  const body = await readValidatedBody(event, (raw) => AddRowSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Étage invalide.' })
  }

  try {
    const row = await event.context.container.addRow.execute({
      householdId,
      shelfId,
      position: body.data.position,
      capacityBack: body.data.capacityBack,
      capacityFront: body.data.capacityFront,
    })
    setResponseStatus(event, 201)
    return row
  }
  catch (error) {
    handleWineCellarError(error)
  }
})
