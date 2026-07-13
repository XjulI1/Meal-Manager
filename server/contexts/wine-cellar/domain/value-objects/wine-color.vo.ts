export type WineColorValue = 'rouge' | 'blanc' | 'rose' | 'effervescent'

const VALUES: ReadonlySet<WineColorValue> = new Set(['rouge', 'blanc', 'rose', 'effervescent'])

export class InvalidWineColorError extends Error {
  override readonly name = 'InvalidWineColorError'
  constructor(value: string) {
    super(`Invalid wine color: "${value}". Expected "rouge", "blanc", "rose" or "effervescent".`)
  }
}

export class WineColor {
  private constructor(readonly value: WineColorValue) {}

  static fromString(value: string): WineColor {
    if (!VALUES.has(value as WineColorValue)) {
      throw new InvalidWineColorError(value)
    }
    return new WineColor(value as WineColorValue)
  }

  equals(other: WineColor): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
