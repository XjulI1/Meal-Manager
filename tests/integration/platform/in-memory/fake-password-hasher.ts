import type { IPasswordHasher } from '../../../../server/contexts/platform/domain/ports/password-hasher.port'

/** Reversible "hasher" for unit tests. NEVER use in production. */
export class FakePasswordHasher implements IPasswordHasher {
  async hash(plaintext: string): Promise<string> {
    return `hashed:${plaintext}`
  }

  async verify(hashed: string, plaintext: string): Promise<boolean> {
    return hashed === `hashed:${plaintext}`
  }
}
