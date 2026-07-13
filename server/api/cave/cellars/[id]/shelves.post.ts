import { AddShelfSchema } from '../../../../../shared/dto/wine-cellar'
import { requireHouseholdMember } from '../../../../utils/require-household'
import { handleWineCellarError } from '../../../../utils/wine-cellar-http'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const cellarId = getRouterParam(event, 'id')
  if (!cellarId) throw createError({ statusCode: 400, statusMessage: 'Identifiant de cave manquant.' })

  const body = await readValidatedBody(event, (raw) => AddShelfSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Clayette invalide.' })
  }

  try {
    const shelf = await event.context.container.addShelf.execute({
      householdId,
      cellarId,
      label: body.data.label,
      position: body.data.position,
    })
    setResponseStatus(event, 201)
    return shelf
  }
  catch (error) {
    handleWineCellarError(error)
  }
})
