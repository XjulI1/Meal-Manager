import { beforeEach, describe, expect, it, vi } from 'vitest'
import listHandler from '../../../server/api/me/tokens/index.get'
import createHandler from '../../../server/api/me/tokens/index.post'
import deleteHandler from '../../../server/api/me/tokens/[id].delete'
import { TokenNotFoundError } from '../../../server/contexts/platform/domain/errors/token-not-found.error'
import { UserNotInHouseholdError } from '../../../server/contexts/platform/domain/errors/user-not-in-household.error'
import { makeEvent } from './nuxt-runtime-stubs'

const session = { user: { id: 'u1', email: 'alice@example.com' } }

describe('GET /api/me/tokens', () => {
  it('returns the user tokens as ISO-serialized views', async () => {
    const createdAt = new Date('2026-05-10T10:00:00Z')
    const lastUsedAt = new Date('2026-05-15T12:00:00Z')
    const listPersonalAccessTokens = {
      execute: vi.fn().mockResolvedValue([
        { id: 'tok-1', name: 'Claude', prefix: 'aaaaaaaa', createdAt, lastUsedAt, revokedAt: null },
      ]),
    }
    const event = makeEvent({ session, container: { listPersonalAccessTokens } })

    const result = await (listHandler as any)(event)

    expect(result).toEqual([
      {
        id: 'tok-1',
        name: 'Claude',
        prefix: 'aaaaaaaa',
        createdAt: '2026-05-10T10:00:00.000Z',
        lastUsedAt: '2026-05-15T12:00:00.000Z',
        revokedAt: null,
      },
    ])
  })

  it('returns 401 without a session', async () => {
    const event = makeEvent({ container: {} })
    await expect((listHandler as any)(event)).rejects.toMatchObject({ statusCode: 401 })
  })
})

describe('POST /api/me/tokens', () => {
  let createPersonalAccessToken: { execute: ReturnType<typeof vi.fn> }
  let container: { createPersonalAccessToken: typeof createPersonalAccessToken }

  beforeEach(() => {
    createPersonalAccessToken = { execute: vi.fn() }
    container = { createPersonalAccessToken }
  })

  it('returns the plaintext once on success', async () => {
    createPersonalAccessToken.execute.mockResolvedValue({
      plaintext: 'mm_pat_abcdefghijklmnopqrstuv',
      token: {
        id: 'tok-1',
        name: 'Claude Desktop',
        prefix: 'abcdefgh',
        createdAt: new Date('2026-05-16T08:00:00Z'),
        lastUsedAt: null,
        revokedAt: null,
      },
    })
    const event = makeEvent({ body: { name: 'Claude Desktop' }, session, container })

    const result = await (createHandler as any)(event)

    expect(result.plaintext).toBe('mm_pat_abcdefghijklmnopqrstuv')
    expect(result.token).toEqual({
      id: 'tok-1',
      name: 'Claude Desktop',
      prefix: 'abcdefgh',
      createdAt: '2026-05-16T08:00:00.000Z',
      lastUsedAt: null,
      revokedAt: null,
    })
    expect(event._status).toBe(201)
  })

  it('returns 400 on empty name', async () => {
    const event = makeEvent({ body: { name: '' }, session, container })
    await expect((createHandler as any)(event)).rejects.toMatchObject({ statusCode: 400 })
    expect(createPersonalAccessToken.execute).not.toHaveBeenCalled()
  })

  it('returns 403 when the user has no household', async () => {
    createPersonalAccessToken.execute.mockRejectedValue(new UserNotInHouseholdError())
    const event = makeEvent({ body: { name: 'X' }, session, container })
    await expect((createHandler as any)(event)).rejects.toMatchObject({ statusCode: 403 })
  })
})

describe('DELETE /api/me/tokens/:id', () => {
  it('revokes on success and returns 204', async () => {
    const revokePersonalAccessToken = { execute: vi.fn().mockResolvedValue(undefined) }
    const event = makeEvent({
      params: { id: 'tok-1' },
      session,
      container: { revokePersonalAccessToken },
    })

    const result = await (deleteHandler as any)(event)

    expect(result).toBeNull()
    expect(event._status).toBe(204)
    expect(revokePersonalAccessToken.execute).toHaveBeenCalledWith({
      userId: 'u1',
      tokenId: 'tok-1',
    })
  })

  it('returns 404 when the token does not exist or belongs to another user', async () => {
    const revokePersonalAccessToken = { execute: vi.fn().mockRejectedValue(new TokenNotFoundError()) }
    const event = makeEvent({
      params: { id: 'tok-other' },
      session,
      container: { revokePersonalAccessToken },
    })

    await expect((deleteHandler as any)(event)).rejects.toMatchObject({ statusCode: 404 })
  })
})
