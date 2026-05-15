import { randomBytes } from 'node:crypto'
import type { IInviteCodeGenerator } from '../domain/ports/invite-code-generator.port'
import { InviteCode } from '../domain/value-objects/invite-code.vo'

export class CryptoInviteCodeGenerator implements IInviteCodeGenerator {
  generate(): InviteCode {
    return InviteCode.generate((n) => new Uint8Array(randomBytes(n)))
  }
}
