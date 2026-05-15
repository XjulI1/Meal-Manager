import type { IInviteCodeGenerator } from '../../../../server/contexts/family/domain/ports/invite-code-generator.port'
import { InviteCode } from '../../../../server/contexts/family/domain/value-objects/invite-code.vo'

/** Yields predictable invite codes for tests. */
export class FakeInviteCodeGenerator implements IInviteCodeGenerator {
  private counter = 0
  constructor(private readonly seeds: readonly string[] = ['ABCD2345', 'EFGH3456', 'JKLM4567']) {}

  generate(): InviteCode {
    const seed = this.seeds[this.counter % this.seeds.length]!
    this.counter++
    return InviteCode.fromString(seed)
  }
}
