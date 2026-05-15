import { describe, expect, it } from 'vitest'
import {
  INVITE_CODE_ALPHABET,
  INVITE_CODE_SIZE,
  InvalidInviteCodeError,
  InviteCode,
} from '../../../server/contexts/family/domain/value-objects/invite-code.vo'

describe('InviteCode', () => {
  it('accepts a well-formed code', () => {
    const code = InviteCode.fromString('ABCD2345')
    expect(code.value).toBe('ABCD2345')
  })

  it('normalizes case and whitespace', () => {
    expect(InviteCode.fromString(' abcd2345 ').value).toBe('ABCD2345')
  })

  it('rejects codes with the wrong length', () => {
    expect(() => InviteCode.fromString('ABCD234')).toThrow(InvalidInviteCodeError)
    expect(() => InviteCode.fromString('ABCD23456')).toThrow(InvalidInviteCodeError)
  })

  it('rejects ambiguous characters (O, 0, 1, I)', () => {
    expect(() => InviteCode.fromString('OOOO1111')).toThrow(InvalidInviteCodeError)
  })

  it('generates codes only from the configured alphabet', () => {
    const fixedBytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7])
    const code = InviteCode.generate(() => fixedBytes)
    expect(code.value).toHaveLength(INVITE_CODE_SIZE)
    for (const char of code.value) {
      expect(INVITE_CODE_ALPHABET).toContain(char)
    }
  })

  it('two codes with the same value are equal', () => {
    expect(InviteCode.fromString('ABCD2345').equals(InviteCode.fromString('abcd2345'))).toBe(true)
  })
})
