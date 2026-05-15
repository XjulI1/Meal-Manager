/**
 * Hydrates `event.context.user` from the session cookie. Routes themselves
 * decide whether they require authentication via `requireUserSession`.
 */
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (session.user) {
    event.context.user = session.user
  }
})
