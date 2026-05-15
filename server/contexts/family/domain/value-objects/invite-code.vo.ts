export class InvalidInviteCodeError extends Error {
  override readonly name = 'InvalidInviteCodeError'
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 32 chars, no 0/O/1/I to avoid ambiguity
const INVITE_CODE_LENGTH = 8
const INVITE_CODE_REGEX = new RegExp(`^[${ALPHABET}]{${INVITE_CODE_LENGTH}}$`)

export class InviteCode {
  private constructor(readonly value: string) {}

  static fromString(value: string): InviteCode {
    const normalized = value.trim().toUpperCase()
    if (!INVITE_CODE_REGEX.test(normalized)) {
      throw new InvalidInviteCodeError(`Invalid invite code format: "${value}".`)
    }
    return new InviteCode(normalized)
  }

  static generate(randomBytes: (n: number) => Uint8Array): InviteCode {
    const bytes = randomBytes(INVITE_CODE_LENGTH)
    let code = ''
    for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
      code += ALPHABET[bytes[i]! % ALPHABET.length]
    }
    return new InviteCode(code)
  }

  equals(other: InviteCode): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}

export const INVITE_CODE_ALPHABET = ALPHABET
export const INVITE_CODE_SIZE = INVITE_CODE_LENGTH
