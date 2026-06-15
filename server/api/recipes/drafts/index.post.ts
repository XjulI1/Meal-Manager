import { SaveRecipeDraftSchema } from '../../../../shared/dto/recipe-drafts'
import { RecipeDraftLimitReachedError } from '../../../contexts/catalog/domain/errors/recipe-draft-limit-reached.error'
import { requireHouseholdMember } from '../../../utils/require-household'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  const body = await readValidatedBody(event, (raw) => SaveRecipeDraftSchema.safeParse(raw))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid recipe draft payload.' })
  }

  const { source, ...content } = body.data

  try {
    setResponseStatus(event, 201)
    return await event.context.container.saveRecipeDraft.execute({
      householdId,
      source,
      content,
    })
  }
  catch (error) {
    if (error instanceof RecipeDraftLimitReachedError) {
      throw createError({ statusCode: 409, statusMessage: error.message })
    }
    throw error
  }
})
