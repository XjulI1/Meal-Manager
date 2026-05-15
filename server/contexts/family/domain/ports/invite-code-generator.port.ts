import type { InviteCode } from '../value-objects/invite-code.vo'

export interface IInviteCodeGenerator {
  generate(): InviteCode
}
