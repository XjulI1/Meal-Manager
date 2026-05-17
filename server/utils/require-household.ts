import type { H3Event } from 'h3'
import { InvalidTokenError } from '../contexts/platform/domain/errors/invalid-token.error'

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

/**
 * Authenticates the request using a Personal Access Token in the
 * `Authorization: Bearer <plaintext>` header. Returns the (user, household)
 * pair bound to that token at issuance time. Cookie sessions are NOT accepted.
 *
 * On failure (missing, malformed, unknown, or revoked token), throws a 401
 * with `WWW-Authenticate: Bearer realm="meal-manager-mcp"` — compatible with
 * a future OAuth 2.1 migration without breaking existing PAT clients.
 */
export async function requireHouseholdFromPAT(event: H3Event): Promise<HouseholdMembershipContext> {
  const header = getHeader(event, 'authorization')
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    throw unauthorizedBearer(event)
  }
  const plaintext = header.slice('bearer '.length).trim()
  if (plaintext.length === 0) {
    throw unauthorizedBearer(event)
  }

  try {
    return await event.context.container.authenticatePersonalAccessToken.execute({ plaintext })
  }
  catch (error) {
    if (error instanceof InvalidTokenError) {
      throw unauthorizedBearer(event)
    }
    throw error
  }
}

function unauthorizedBearer(event: H3Event) {
  // Set the challenge header on the response BEFORE throwing — h3's createError
  // does not carry response headers itself.
  setResponseHeader(event, 'WWW-Authenticate', 'Bearer realm="meal-manager-mcp"')
  return createError({ statusCode: 401, statusMessage: 'Unauthorized' })
}
