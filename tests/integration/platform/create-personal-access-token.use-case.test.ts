import { beforeEach, describe, expect, it } from 'vitest'
import { CreatePersonalAccessTokenUseCase } from '../../../server/contexts/platform/application/use-cases/create-personal-access-token.use-case'
import { UserNotInHouseholdError } from '../../../server/contexts/platform/domain/errors/user-not-in-household.error'
import { FakeTokenGenerator } from './in-memory/fake-token-generator'
import { FakeUserHouseholdResolver } from './in-memory/fake-user-household-resolver'
import { InMemoryPersonalAccessTokenRepository } from './in-memory/in-memory-personal-access-token.repository'

describe('CreatePersonalAccessTokenUseCase', () => {
  let repo: InMemoryPersonalAccessTokenRepository
  let resolver: FakeUserHouseholdResolver
  let generator: FakeTokenGenerator
  let useCase: CreatePersonalAccessTokenUseCase
  let idCount = 0

  beforeEach(() => {
    repo = new InMemoryPersonalAccessTokenRepository()
    resolver = new FakeUserHouseholdResolver()
    generator = new FakeTokenGenerator()
    idCount = 0
    useCase = new CreatePersonalAccessTokenUseCase(repo, resolver, generator, () => {
      idCount += 1
      return `tok-${idCount}`
    })
  })

  it('issues a token bound to the user current household', async () => {
    resolver.bind('user-1', 'hh-1')

    const result = await useCase.execute({ userId: 'user-1', name: 'Claude Desktop' })

    expect(result.plaintext).toMatch(/^mm_pat_/)
    expect(result.token).toMatchObject({
      id: 'tok-1',
      name: 'Claude Desktop',
      lastUsedAt: null,
      revokedAt: null,
    })
    expect(result.token.prefix).toHaveLength(8)
    expect(repo.size).toBe(1)
  })

  it('persists only the hash, never the plaintext', async () => {
    resolver.bind('user-1', 'hh-1')

    const result = await useCase.execute({ userId: 'user-1', name: 'Claude' })
    const stored = await repo.findById(result.token.id)

    expect(stored).not.toBeNull()
    expect(stored?.tokenHash).toBe(generator.hash(result.plaintext))
    expect(stored?.tokenHash).not.toBe(result.plaintext)
    expect(stored?.householdId).toBe('hh-1')
    expect(stored?.userId).toBe('user-1')
  })

  it('rejects when the user is not in a household', async () => {
    await expect(useCase.execute({ userId: 'orphan', name: 'X' })).rejects.toBeInstanceOf(
      UserNotInHouseholdError,
    )
    expect(repo.size).toBe(0)
  })

  it('rejects empty or too-long names', async () => {
    resolver.bind('user-1', 'hh-1')

    await expect(useCase.execute({ userId: 'user-1', name: '' })).rejects.toThrow()
    await expect(useCase.execute({ userId: 'user-1', name: 'a'.repeat(81) })).rejects.toThrow()
  })
})
