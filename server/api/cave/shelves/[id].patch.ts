import { RenameShelfSchema } from '../../../../shared/dto/wine-cellar'
import { requireHouseholdMember } from '../../../utils/require-household'
import { handleWineCellarError } from '../../../utils/wine-cellar-http'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Identifiant de clayette manquant.' })

  const body = await readValidatedBody(event, (raw) => RenameShelfSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Libellé de clayette invalide.' })
  }

  try {
    return await event.context.container.renameShelf.execute({
      householdId,
      id,
      label: body.data.label.length > 0 ? body.data.label : null,
    })
  }
  catch (error) {
    handleWineCellarError(error)
  }
})
