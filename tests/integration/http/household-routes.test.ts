import { beforeEach, describe, expect, it, vi } from 'vitest'
import createHandler from '../../../server/api/households/index.post'
import joinHandler from '../../../server/api/households/join.post'
import leaveHandler from '../../../server/api/households/leave.post'
import meHandler from '../../../server/api/households/me.get'
import { AlreadyInHouseholdError } from '../../../server/contexts/family/domain/errors/already-in-household.error'
import { HouseholdNotFoundError } from '../../../server/contexts/family/domain/errors/household-not-found.error'
import { NotInHouseholdError } from '../../../server/contexts/family/domain/errors/not-in-household.error'
import { makeEvent } from './nuxt-runtime-stubs'

const session = { user: { id: 'u1', email: 'alice@example.com' } }

describe('POST /api/households', () => {
  let createHousehold: { execute: ReturnType<typeof vi.fn> }
  let container: { createHousehold: typeof createHousehold }

  beforeEach(() => {
    createHousehold = { execute: vi.fn() }
    container = { createHousehold }
  })

  it('returns the new household on success', async () => {
    createHousehold.execute.mockResolvedValue({ id: 'hh-1', name: 'Famille', inviteCode: 'ABCD2345' })
    const event = makeEvent({ body: { name: 'Famille' }, session, container })
    const result = await (createHandler as any)(event)
    expect(result).toEqual({ id: 'hh-1', name: 'Famille', inviteCode: 'ABCD2345' })
    expect(createHousehold.execute).toHaveBeenCalledWith({ userId: 'u1', name: 'Famille' })
  })

  it('returns 401 when no session is present', async () => {
    const event = makeEvent({ body: { name: 'Famille' }, container })
    await expect((createHandler as any)(event)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('returns 409 when the user already belongs to a household', async () => {
    createHousehold.execute.mockRejectedValue(new AlreadyInHouseholdError())
    const event = makeEvent({ body: { name: 'Famille' }, session, container })
    await expect((createHandler as any)(event)).rejects.toMatchObject({ statusCode: 409 })
  })

  it('returns 400 on invalid body', async () => {
    const event = makeEvent({ body: { name: '' }, session, container })
    await expect((createHandler as any)(event)).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('POST /api/households/join', () => {
  let joinHousehold: { execute: ReturnType<typeof vi.fn> }
  let container: { joinHousehold: typeof joinHousehold }

  beforeEach(() => {
    joinHousehold = { execute: vi.fn() }
    container = { joinHousehold }
  })

  it('joins on success', async () => {
    joinHousehold.execute.mockResolvedValue({ householdId: 'hh-1', name: 'Famille' })
    const event = makeEvent({ body: { inviteCode: 'ABCD2345' }, session, container })
    const result = await (joinHandler as any)(event)
    expect(result).toEqual({ householdId: 'hh-1', name: 'Famille' })
  })

  it('returns 404 when the invite code is unknown', async () => {
    joinHousehold.execute.mockRejectedValue(new HouseholdNotFoundError())
    const event = makeEvent({ body: { inviteCode: 'ZZZZ9999' }, session, container })
    await expect((joinHandler as any)(event)).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('POST /api/households/leave', () => {
  it('returns householdDeleted: false on success', async () => {
    const leaveHousehold = { execute: vi.fn().mockResolvedValue({ householdDeleted: false }) }
    const event = makeEvent({ session, container: { leaveHousehold } })
    const result = await (leaveHandler as any)(event)
    expect(result).toEqual({ householdDeleted: false })
  })

  it('returns 404 when the user is not in a household', async () => {
    const leaveHousehold = { execute: vi.fn().mockRejectedValue(new NotInHouseholdError()) }
    const event = makeEvent({ session, container: { leaveHousehold } })
    await expect((leaveHandler as any)(event)).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('GET /api/households/me', () => {
  it('returns the current household', async () => {
    const view = {
      id: 'hh-1',
      name: 'Famille',
      inviteCode: 'ABCD2345',
      members: [{ userId: 'u1', email: 'alice@example.com', joinedAt: new Date() }],
    }
    const getCurrentHousehold = { execute: vi.fn().mockResolvedValue(view) }
    const event = makeEvent({ session, container: { getCurrentHousehold } })
    const result = await (meHandler as any)(event)
    expect(result).toEqual(view)
  })

  it('returns 404 when the user has no household', async () => {
    const getCurrentHousehold = { execute: vi.fn().mockRejectedValue(new NotInHouseholdError()) }
    const event = makeEvent({ session, container: { getCurrentHousehold } })
    await expect((meHandler as any)(event)).rejects.toMatchObject({ statusCode: 404 })
  })
})
