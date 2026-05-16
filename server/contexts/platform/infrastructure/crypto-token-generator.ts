import { createHash, randomBytes } from 'node:crypto'
import type { GeneratedToken, ITokenGenerator } from '../domain/ports/token-generator.port'

const TOKEN_PREFIX = 'mm_pat_'

/**
 * Generates Personal Access Tokens of the form `mm_pat_<22 base64url chars>`
 * (~176 bits of entropy). Stores SHA-256 hex hash only. Argon2id is NOT used
 * here — see openspec/changes/add-mcp-llm-integration/design.md §D2.
 */
export class CryptoTokenGenerator implements ITokenGenerator {
  generate(): GeneratedToken {
    const randomPart = randomBytes(22).toString('base64url')
    const plaintext = `${TOKEN_PREFIX}${randomPart}`
    return {
      plaintext,
      hash: this.hash(plaintext),
      prefix: randomPart.slice(0, 8),
    }
  }

  hash(plaintext: string): string {
    return createHash('sha256').update(plaintext).digest('hex')
  }
}
