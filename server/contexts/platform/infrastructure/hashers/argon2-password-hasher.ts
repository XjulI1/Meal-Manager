import { hash, verify } from '@node-rs/argon2'
import type { IPasswordHasher } from '../../domain/ports/password-hasher.port'

// Algorithm enum value 2 = Argon2id (`@node-rs/argon2` uses a const enum, which
// `verbatimModuleSyntax` cannot import). OWASP 2024 recommended parameters
// (low-memory profile); memoryCost is expressed in KiB.
const ARGON2_OPTIONS = {
  algorithm: 2,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const

export class Argon2PasswordHasher implements IPasswordHasher {
  async hash(plaintext: string): Promise<string> {
    return hash(plaintext, ARGON2_OPTIONS)
  }

  async verify(hashed: string, plaintext: string): Promise<boolean> {
    try {
      return await verify(hashed, plaintext, ARGON2_OPTIONS)
    }
    catch {
      return false
    }
  }
}
