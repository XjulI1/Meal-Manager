export const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

export type DayOfWeekValue = typeof DAYS_OF_WEEK[number]

const VALUES: ReadonlySet<DayOfWeekValue> = new Set(DAYS_OF_WEEK)

export class InvalidDayOfWeekError extends Error {
  override readonly name = 'InvalidDayOfWeekError'
  constructor(value: string) {
    super(`Invalid day of week: "${value}". Expected one of ${DAYS_OF_WEEK.join(', ')}.`)
  }
}

export class DayOfWeek {
  private constructor(readonly value: DayOfWeekValue) {}

  static fromString(value: string): DayOfWeek {
    if (!VALUES.has(value as DayOfWeekValue)) {
      throw new InvalidDayOfWeekError(value)
    }
    return new DayOfWeek(value as DayOfWeekValue)
  }

  equals(other: DayOfWeek): boolean {
    return this.value === other.value
  }
}
