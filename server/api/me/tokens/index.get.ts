export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const tokens = await event.context.container.listPersonalAccessTokens.execute({
    userId: session.user.id,
  })
  return tokens.map((t) => ({
    id: t.id,
    name: t.name,
    prefix: t.prefix,
    createdAt: t.createdAt.toISOString(),
    lastUsedAt: t.lastUsedAt ? t.lastUsedAt.toISOString() : null,
    revokedAt: t.revokedAt ? t.revokedAt.toISOString() : null,
  }))
})
