import type { H3Event } from 'h3'

export interface HouseholdMembershipContext {
  userId: string
  householdId: string
}

/**
 * Ensures the current request is authenticated AND that the user belongs to a
 * household. Returns the user's id and their household id. Routes that scope
 * data by household should call this at the top of their handler.
 */
export async function requireHouseholdMember(event: H3Event): Promise<HouseholdMembershipContext> {
  const session = await requireUserSession(event)
  try {
    const household = await event.context.container.getCurrentHousehold.execute({
      userId: session.user.id,
    })
    return { userId: session.user.id, householdId: household.id }
  }
  catch {
    throw createError({
      statusCode: 403,
      statusMessage: 'You must join a household before accessing this resource.',
    })
  }
}
