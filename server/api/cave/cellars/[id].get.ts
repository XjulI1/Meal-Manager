import { requireHouseholdMember } from '../../../utils/require-household'
import { handleWineCellarError } from '../../../utils/wine-cellar-http'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Identifiant de cave manquant.' })

  try {
    return await event.context.container.getCellarLayout.execute({ householdId, cellarId: id })
  }
  catch (error) {
    handleWineCellarError(error)
  }
})
