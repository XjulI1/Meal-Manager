import { describe, expect, it } from 'vitest'
import { isValidLabelKey } from '../../../server/contexts/wine-cellar/infrastructure/adapters/label-photo-key'

const UUID_A = '11111111-1111-1111-1111-111111111111'
const UUID_B = '22222222-2222-2222-2222-222222222222'

describe('isValidLabelKey', () => {
  it('accepts a well-formed <householdId>/<uuid>.<ext> key', () => {
    expect(isValidLabelKey(`${UUID_A}/${UUID_B}.jpg`)).toBe(true)
    expect(isValidLabelKey(`${UUID_A}/${UUID_B}.png`)).toBe(true)
    expect(isValidLabelKey(`${UUID_A}/${UUID_B}.webp`)).toBe(true)
  })

  it('rejects path-traversal and malformed keys', () => {
    expect(isValidLabelKey(`${UUID_A}/../${UUID_B}.jpg`)).toBe(false)
    expect(isValidLabelKey(`../../etc/passwd`)).toBe(false)
    expect(isValidLabelKey(`/etc/passwd`)).toBe(false)
    expect(isValidLabelKey(`${UUID_A}/${UUID_B}.gif`)).toBe(false)
    expect(isValidLabelKey(`${UUID_A}/${UUID_B}`)).toBe(false)
    expect(isValidLabelKey(`not-a-uuid/${UUID_B}.jpg`)).toBe(false)
    expect(isValidLabelKey('')).toBe(false)
  })
})
