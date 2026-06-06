import type { H3Event } from 'h3'
import { requireHouseholdMember, type HouseholdMembershipContext } from './require-household'

/**
 * Ensures the request is an authenticated household member AND that the user's
 * account has AI features enabled. Returns the (user, household) context.
 *
 * The flag is read from the database (via the container) rather than the
 * session, so an admin toggle of `ai_enabled` takes effect on the next request.
 * Throws 403 when AI is disabled — callers MUST invoke this before any call to
 * the Anthropic API.
 */
export async function requireAiEnabled(event: H3Event): Promise<HouseholdMembershipContext> {
  const ctx = await requireHouseholdMember(event)
  const { aiEnabled } = await event.context.container.getUserAiAccess.execute({ userId: ctx.userId })
  if (!aiEnabled) {
    throw createError({
      statusCode: 403,
      statusMessage: 'AI features are disabled for this account.',
    })
  }
  return ctx
}
