export class InvalidWeekStartError extends Error {
  override readonly name = 'InvalidWeekStartError'
  constructor(value: string) {
    super(`Invalid weekStart: "${value}". Expected an ISO date (YYYY-MM-DD) that falls on a Monday.`)
  }
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

/**
 * Identity of a weekly menu: the Monday of the ISO week, normalized to UTC
 * midnight. Constructors enforce the Monday invariant.
 */
export class WeekStart {
  private constructor(readonly date: Date) {}

  /** Parses an ISO date string (YYYY-MM-DD); rejects anything that isn't a Monday. */
  static fromIsoDate(value: string): WeekStart {
    if (!ISO_DATE_REGEX.test(value)) {
      throw new InvalidWeekStartError(value)
    }
    const date = new Date(`${value}T00:00:00.000Z`)
    if (Number.isNaN(date.getTime()) || date.getUTCDay() !== 1) {
      throw new InvalidWeekStartError(value)
    }
    return new WeekStart(date)
  }

  /** Derives the Monday at UTC midnight for a given date (rolls back if needed). */
  static mondayOf(date: Date): WeekStart {
    if (Number.isNaN(date.getTime())) {
      throw new InvalidWeekStartError(String(date))
    }
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    const day = d.getUTCDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setUTCDate(d.getUTCDate() + diff)
    return new WeekStart(d)
  }

  toIsoDate(): string {
    const yyyy = this.date.getUTCFullYear().toString().padStart(4, '0')
    const mm = (this.date.getUTCMonth() + 1).toString().padStart(2, '0')
    const dd = this.date.getUTCDate().toString().padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  equals(other: WeekStart): boolean {
    return this.date.getTime() === other.date.getTime()
  }
}
