import { beforeEach, describe, expect, it } from 'vitest'
import { AuthenticatePersonalAccessTokenUseCase } from '../../../server/contexts/platform/application/use-cases/authenticate-personal-access-token.use-case'
import { CreatePersonalAccessTokenUseCase } from '../../../server/contexts/platform/application/use-cases/create-personal-access-token.use-case'
import { RevokePersonalAccessTokenUseCase } from '../../../server/contexts/platform/application/use-cases/revoke-personal-access-token.use-case'
import { InvalidTokenError } from '../../../server/contexts/platform/domain/errors/invalid-token.error'
import { FakeTokenGenerator } from './in-memory/fake-token-generator'
import { FakeUserHouseholdResolver } from './in-memory/fake-user-household-resolver'
import { InMemoryPersonalAccessTokenRepository } from './in-memory/in-memory-personal-access-token.repository'

describe('AuthenticatePersonalAccessTokenUseCase', () => {
  let repo: InMemoryPersonalAccessTokenRepository
  let resolver: FakeUserHouseholdResolver
  let generator: FakeTokenGenerator
  let create: CreatePersonalAccessTokenUseCase
  let revoke: RevokePersonalAccessTokenUseCase
  let auth: AuthenticatePersonalAccessTokenUseCase
  let idCount = 0

  beforeEach(() => {
    repo = new InMemoryPersonalAccessTokenRepository()
    resolver = new FakeUserHouseholdResolver()
    generator = new FakeTokenGenerator()
    resolver.bind('user-1', 'hh-1')
    resolver.bind('user-2', 'hh-2')
    idCount = 0
    const idGen = () => {
      idCount += 1
      return `tok-${idCount}`
    }
    create = new CreatePersonalAccessTokenUseCase(repo, resolver, generator, idGen)
    revoke = new RevokePersonalAccessTokenUseCase(repo)
    auth = new AuthenticatePersonalAccessTokenUseCase(repo, generator)
  })

  it('authenticates a valid token and returns its bound (user, household)', async () => {
    const { plaintext } = await create.execute({ userId: 'user-1', name: 'Claude' })

    const result = await auth.execute({ plaintext })

    expect(result).toEqual({ userId: 'user-1', householdId: 'hh-1' })
  })

  it('updates lastUsedAt on successful authentication', async () => {
    const { plaintext, token } = await create.execute({ userId: 'user-1', name: 'Claude' })
    expect((await repo.findById(token.id))?.lastUsedAt).toBeNull()

    await auth.execute({ plaintext })
    // touch is fire-and-forget; awaiting a tick ensures the in-memory side effect ran
    await new Promise((r) => setTimeout(r, 0))

    expect((await repo.findById(token.id))?.lastUsedAt).not.toBeNull()
  })

  it('rejects unknown tokens', async () => {
    await expect(auth.execute({ plaintext: 'mm_pat_unknown000000000000' })).rejects.toBeInstanceOf(
      InvalidTokenError,
    )
  })

  it('rejects tokens with the wrong prefix', async () => {
    await expect(auth.execute({ plaintext: 'not-a-pat' })).rejects.toBeInstanceOf(
      InvalidTokenError,
    )
  })

  it('rejects revoked tokens', async () => {
    const { plaintext, token } = await create.execute({ userId: 'user-1', name: 'Claude' })
    await revoke.execute({ userId: 'user-1', tokenId: token.id })

    await expect(auth.execute({ plaintext })).rejects.toBeInstanceOf(InvalidTokenError)
  })

  it('isolates households across tokens', async () => {
    const a = await create.execute({ userId: 'user-1', name: 'A' })
    const b = await create.execute({ userId: 'user-2', name: 'B' })

    expect((await auth.execute({ plaintext: a.plaintext })).householdId).toBe('hh-1')
    expect((await auth.execute({ plaintext: b.plaintext })).householdId).toBe('hh-2')
  })
})
