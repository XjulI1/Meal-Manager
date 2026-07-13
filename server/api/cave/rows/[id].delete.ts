import { requireHouseholdMember } from '../../../utils/require-household'
import { handleWineCellarError } from '../../../utils/wine-cellar-http'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Identifiant d\'étage manquant.' })

  try {
    await event.context.container.deleteRow.execute({ householdId, id })
    setResponseStatus(event, 204)
    return null
  }
  catch (error) {
    handleWineCellarError(error)
  }
})
