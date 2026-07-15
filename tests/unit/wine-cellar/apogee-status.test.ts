import { describe, expect, it } from 'vitest'
import {
  computeApogeeStatus,
  isDrinkableInYear,
} from '../../../server/contexts/wine-cellar/domain/value-objects/apogee-status.vo'

const Y = 2026

describe('isDrinkableInYear', () => {
  it('is true when the year falls inside a closed window', () => {
    expect(isDrinkableInYear(2024, 2030, Y)).toBe(true)
  })

  it('is false before the window opens', () => {
    expect(isDrinkableInYear(2030, 2040, Y)).toBe(false)
  })

  it('is false after the window closes', () => {
    expect(isDrinkableInYear(2015, 2022, Y)).toBe(false)
  })

  it('treats a null lower bound as open-ended', () => {
    expect(isDrinkableInYear(null, 2030, Y)).toBe(true)
  })

  it('treats a null upper bound as open-ended', () => {
    expect(isDrinkableInYear(2020, null, Y)).toBe(true)
  })

  it('is true when both bounds are null', () => {
    expect(isDrinkableInYear(null, null, Y)).toBe(true)
  })

  it('is inclusive on both bounds', () => {
    expect(isDrinkableInYear(2026, 2026, Y)).toBe(true)
  })
})

describe('computeApogeeStatus', () => {
  it('returns "au-sommet" in the core of the window', () => {
    expect(computeApogeeStatus(2024, 2030, Y)).toBe('au-sommet')
  })

  it('returns "debut-apogee" on the first window year', () => {
    expect(computeApogeeStatus(2026, 2030, Y)).toBe('debut-apogee')
  })

  it('returns "fin-apogee" on the last window year', () => {
    expect(computeApogeeStatus(2020, 2026, Y)).toBe('fin-apogee')
  })

  it('lets the closing signal win for a single-year window (start === end)', () => {
    expect(computeApogeeStatus(2026, 2026, Y)).toBe('fin-apogee')
  })

  it('has no core phase for a two-year window', () => {
    expect(computeApogeeStatus(2026, 2027, Y)).toBe('debut-apogee')
    expect(computeApogeeStatus(2025, 2026, Y)).toBe('fin-apogee')
  })

  describe('proportional edges scale with window length', () => {
    // 10-year window [2020, 2030]: edges ≈ 2 years (20% of 10).
    it('début covers the first ~20% of a 10-year window', () => {
      expect(computeApogeeStatus(2020, 2030, 2020)).toBe('debut-apogee')
      expect(computeApogeeStatus(2020, 2030, 2021)).toBe('debut-apogee')
      expect(computeApogeeStatus(2020, 2030, 2022)).toBe('debut-apogee') // exactly 20%
      expect(computeApogeeStatus(2020, 2030, 2023)).toBe('au-sommet')
    })

    it('fin covers the last ~20% of a 10-year window', () => {
      expect(computeApogeeStatus(2020, 2030, 2027)).toBe('au-sommet')
      expect(computeApogeeStatus(2020, 2030, 2028)).toBe('fin-apogee') // exactly 20% from end
      expect(computeApogeeStatus(2020, 2030, 2029)).toBe('fin-apogee')
      expect(computeApogeeStatus(2020, 2030, 2030)).toBe('fin-apogee')
    })

    // 4-year window [2024, 2028]: edges ≈ 1 year (20% of 4 = 0.8).
    it('début/fin cover only the extreme years of a short 4-year window', () => {
      expect(computeApogeeStatus(2024, 2028, 2024)).toBe('debut-apogee')
      expect(computeApogeeStatus(2024, 2028, 2025)).toBe('au-sommet')
      expect(computeApogeeStatus(2024, 2028, 2026)).toBe('au-sommet')
      expect(computeApogeeStatus(2024, 2028, 2027)).toBe('au-sommet')
      expect(computeApogeeStatus(2024, 2028, 2028)).toBe('fin-apogee')
    })
  })

  it('returns "depasse" once the window has closed', () => {
    expect(computeApogeeStatus(2015, 2022, Y)).toBe('depasse')
  })

  it('returns "a-venir" before the window opens', () => {
    expect(computeApogeeStatus(2030, 2040, Y)).toBe('a-venir')
  })

  it('returns "au-sommet" with an open lower bound (no start/end nuance)', () => {
    expect(computeApogeeStatus(null, 2030, Y)).toBe('au-sommet')
  })

  it('returns "au-sommet" with an open lower bound even on the gardeMax year', () => {
    expect(computeApogeeStatus(null, 2026, Y)).toBe('au-sommet')
  })

  it('still returns "depasse" past a known gardeMax with an open lower bound', () => {
    expect(computeApogeeStatus(null, 2022, Y)).toBe('depasse')
  })

  it('returns "au-sommet" with an open upper bound (never closes)', () => {
    expect(computeApogeeStatus(2020, null, Y)).toBe('au-sommet')
  })

  it('returns "au-sommet" with an open upper bound on the gardeMin year', () => {
    expect(computeApogeeStatus(2026, null, Y)).toBe('au-sommet')
  })

  it('returns "garde-non-renseignee" when both bounds are null', () => {
    expect(computeApogeeStatus(null, null, Y)).toBe('garde-non-renseignee')
  })
})
