import { ExitBottleSchema } from '../../../../../shared/dto/wine-cellar'
import { requireHouseholdMember } from '../../../../utils/require-household'
import { handleWineCellarError } from '../../../../utils/wine-cellar-http'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Identifiant de bouteille manquant.' })

  const body = await readValidatedBody(event, (raw) => ExitBottleSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Sortie invalide.' })
  }

  try {
    return await event.context.container.exitBottle.execute({
      householdId,
      id,
      reason: body.data.reason,
      exitDate: body.data.exitDate,
      tastingNote: body.data.tastingNote,
    })
  }
  catch (error) {
    handleWineCellarError(error)
  }
})
