import { describe, expect, it } from 'vitest'
import { InvalidWeekStartError, WeekStart } from '../../../server/contexts/meal-planning/domain/value-objects/week-start.vo'

describe('WeekStart', () => {
  it('parses a valid Monday ISO date', () => {
    const ws = WeekStart.fromIsoDate('2026-05-18')
    expect(ws.toIsoDate()).toBe('2026-05-18')
  })

  it('rejects a Tuesday', () => {
    expect(() => WeekStart.fromIsoDate('2026-05-19')).toThrow(InvalidWeekStartError)
  })

  it('rejects a Sunday', () => {
    expect(() => WeekStart.fromIsoDate('2026-05-17')).toThrow(InvalidWeekStartError)
  })

  it('rejects malformed input', () => {
    expect(() => WeekStart.fromIsoDate('not-a-date')).toThrow(InvalidWeekStartError)
    expect(() => WeekStart.fromIsoDate('2026/05/18')).toThrow(InvalidWeekStartError)
    expect(() => WeekStart.fromIsoDate('2026-13-01')).toThrow(InvalidWeekStartError)
  })

  it('derives the Monday for a midweek date (Wednesday)', () => {
    const wednesday = new Date(Date.UTC(2026, 4, 20)) // 2026-05-20 (Wednesday)
    expect(WeekStart.mondayOf(wednesday).toIsoDate()).toBe('2026-05-18')
  })

  it('keeps the same date for a Monday', () => {
    const monday = new Date(Date.UTC(2026, 4, 18)) // 2026-05-18 (Monday)
    expect(WeekStart.mondayOf(monday).toIsoDate()).toBe('2026-05-18')
  })

  it('rolls back to Monday for a Sunday', () => {
    const sunday = new Date(Date.UTC(2026, 4, 24)) // 2026-05-24 (Sunday)
    expect(WeekStart.mondayOf(sunday).toIsoDate()).toBe('2026-05-18')
  })

  it('equality compares the underlying date', () => {
    expect(WeekStart.fromIsoDate('2026-05-18').equals(WeekStart.fromIsoDate('2026-05-18'))).toBe(true)
    expect(WeekStart.fromIsoDate('2026-05-18').equals(WeekStart.fromIsoDate('2026-05-25'))).toBe(false)
  })
})
