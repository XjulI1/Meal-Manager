import { createHash } from 'node:crypto'
import type {
  GeneratedToken,
  ITokenGenerator,
} from '../../../../server/contexts/platform/domain/ports/token-generator.port'

/**
 * Deterministic token generator for tests. Issues sequential tokens of the
 * form `mm_pat_test<N>_pad...` (padded to 22 chars after the prefix to match
 * the real generator's shape). Hash is the real SHA-256 so tests exercise the
 * authentication lookup path end-to-end.
 */
export class FakeTokenGenerator implements ITokenGenerator {
  private seq = 0
  readonly issued: GeneratedToken[] = []

  generate(): GeneratedToken {
    this.seq += 1
    const padded = String(this.seq).padStart(22, 'a')
    const plaintext = `mm_pat_${padded}`
    const generated: GeneratedToken = {
      plaintext,
      hash: this.hash(plaintext),
      prefix: padded.slice(0, 8),
    }
    this.issued.push(generated)
    return generated
  }

  hash(plaintext: string): string {
    return createHash('sha256').update(plaintext).digest('hex')
  }
}
