import { CreateCellarSchema } from '../../../../shared/dto/wine-cellar'
import { requireHouseholdMember } from '../../../utils/require-household'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const body = await readValidatedBody(event, (raw) => CreateCellarSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Nom de cave invalide.' })
  }

  const cellar = await event.context.container.createCellar.execute({
    householdId,
    name: body.data.name,
  })
  setResponseStatus(event, 201)
  return cellar
})
