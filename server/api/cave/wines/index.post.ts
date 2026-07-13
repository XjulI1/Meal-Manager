import { CreateWineSchema } from '../../../../shared/dto/wine-cellar'
import { requireHouseholdMember } from '../../../utils/require-household'
import { handleWineCellarError } from '../../../utils/wine-cellar-http'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const body = await readValidatedBody(event, (raw) => CreateWineSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Vin invalide.' })
  }

  try {
    const wine = await event.context.container.createWine.execute({ householdId, ...body.data })
    setResponseStatus(event, 201)
    return wine
  }
  catch (error) {
    handleWineCellarError(error)
  }
})
