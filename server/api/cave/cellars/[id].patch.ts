import { RenameCellarSchema } from '../../../../shared/dto/wine-cellar'
import { requireHouseholdMember } from '../../../utils/require-household'
import { handleWineCellarError } from '../../../utils/wine-cellar-http'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Identifiant de cave manquant.' })

  const body = await readValidatedBody(event, (raw) => RenameCellarSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Nom de cave invalide.' })
  }

  try {
    return await event.context.container.renameCellar.execute({ householdId, id, name: body.data.name })
  }
  catch (error) {
    handleWineCellarError(error)
  }
})
