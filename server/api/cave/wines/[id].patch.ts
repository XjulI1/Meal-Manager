import { UpdateWineSchema } from '../../../../shared/dto/wine-cellar'
import { requireHouseholdMember } from '../../../utils/require-household'
import { handleWineCellarError } from '../../../utils/wine-cellar-http'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Identifiant de vin manquant.' })

  const body = await readValidatedBody(event, (raw) => UpdateWineSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Vin invalide.' })
  }

  try {
    return await event.context.container.updateWine.execute({ householdId, id, ...body.data })
  }
  catch (error) {
    handleWineCellarError(error)
  }
})
