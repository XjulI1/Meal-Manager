import { describe, it, expect } from 'vitest'
import {
  Quantity,
  IncompatibleUnitsError,
  InvalidQuantityError,
} from '../../shared/units/quantity'
import { UnknownUnitError } from '../../shared/units/conversions'

describe('Quantity — creation', () => {
  it('stores canonical value as-is when built from canonical', () => {
    const q = Quantity.fromCanonical(2000, 'g')
    expect(q.value).toBe(2000)
    expect(q.unit).toBe('g')
    expect(q.dimension).toBe('mass')
  })

  it('converts kg to g at the boundary', () => {
    const q = Quantity.fromUserInput(2, 'kg')
    expect(q.value).toBe(2000)
    expect(q.unit).toBe('g')
  })

  it('converts L to ml at the boundary', () => {
    const q = Quantity.fromUserInput(1.5, 'L')
    expect(q.value).toBe(1500)
    expect(q.unit).toBe('ml')
  })

  it('converts cl to ml', () => {
    expect(Quantity.fromUserInput(33, 'cl').value).toBe(330)
  })

  it('converts mg to g (sub-gram rounded to nearest integer)', () => {
    expect(Quantity.fromUserInput(500, 'mg').value).toBe(1) // 0.5 rounds to 1
    expect(Quantity.fromUserInput(1500, 'mg').value).toBe(2) // 1.5 rounds to 2
  })

  it('treats unit symbols case-insensitively', () => {
    expect(Quantity.fromUserInput(1, 'KG').value).toBe(1000)
    expect(Quantity.fromUserInput(1, 'Kg').value).toBe(1000)
  })

  it('rejects unknown units', () => {
    expect(() => Quantity.fromUserInput(1, 'tbsp')).toThrow(UnknownUnitError)
  })

  it('rejects negative quantities', () => {
    expect(() => Quantity.fromUserInput(-1, 'g')).toThrow(InvalidQuantityError)
    expect(() => Quantity.fromCanonical(-1, 'g')).toThrow(InvalidQuantityError)
  })

  it('rejects non-finite quantities', () => {
    expect(() => Quantity.fromCanonical(Number.NaN, 'g')).toThrow(InvalidQuantityError)
    expect(() => Quantity.fromCanonical(Number.POSITIVE_INFINITY, 'g')).toThrow(InvalidQuantityError)
  })
})

describe('Quantity — display conversion', () => {
  it('returns canonical when no target unit is provided', () => {
    const q = Quantity.fromCanonical(1500, 'g')
    expect(q.toDisplay()).toEqual({ value: 1500, unit: 'g' })
  })

  it('converts to a larger unit for display', () => {
    const q = Quantity.fromCanonical(1500, 'g')
    expect(q.toDisplay('kg')).toEqual({ value: 1.5, unit: 'kg' })
  })

  it('refuses to display across dimensions', () => {
    const mass = Quantity.fromCanonical(100, 'g')
    expect(() => mass.toDisplay('ml')).toThrow(IncompatibleUnitsError)
  })
})

describe('Quantity — arithmetic', () => {
  it('adds two masses', () => {
    const a = Quantity.fromUserInput(500, 'g')
    const b = Quantity.fromUserInput(1, 'kg')
    expect(a.add(b).value).toBe(1500)
  })

  it('subtracts two masses', () => {
    const a = Quantity.fromUserInput(1, 'kg')
    const b = Quantity.fromUserInput(250, 'g')
    expect(a.subtract(b).value).toBe(750)
  })

  it('throws when subtraction would produce a negative result', () => {
    const a = Quantity.fromUserInput(100, 'g')
    const b = Quantity.fromUserInput(200, 'g')
    expect(() => a.subtract(b)).toThrow(InvalidQuantityError)
  })

  it('clamped subtraction returns zero instead of throwing', () => {
    const a = Quantity.fromUserInput(100, 'g')
    const b = Quantity.fromUserInput(200, 'g')
    const result = a.subtractClamped(b)
    expect(result.isZero()).toBe(true)
  })

  it('rejects addition of incompatible dimensions', () => {
    const mass = Quantity.fromCanonical(100, 'g')
    const volume = Quantity.fromCanonical(100, 'ml')
    expect(() => mass.add(volume)).toThrow(IncompatibleUnitsError)
    expect(() => mass.subtract(volume)).toThrow(IncompatibleUnitsError)
  })

  it('rejects mixing discrete and mass', () => {
    const apples = Quantity.fromUserInput(3, 'unit')
    const flour = Quantity.fromUserInput(200, 'g')
    expect(() => apples.add(flour)).toThrow(IncompatibleUnitsError)
  })
})

describe('Quantity — equality', () => {
  it('equals when value, unit and dimension match', () => {
    expect(Quantity.fromUserInput(1, 'kg').equals(Quantity.fromUserInput(1000, 'g'))).toBe(true)
  })

  it('does not equal across dimensions even with same value', () => {
    expect(Quantity.fromCanonical(100, 'g').equals(Quantity.fromCanonical(100, 'ml'))).toBe(false)
  })
})
