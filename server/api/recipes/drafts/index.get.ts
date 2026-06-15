import { requireHouseholdMember } from '../../../utils/require-household'

export default defineEventHandler(async (event) => {
  const { householdId } = await requireHouseholdMember(event)
  return await event.context.container.listRecipeDrafts.execute({ householdId })
})
