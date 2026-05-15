export type StorageLocationValue = 'pantry' | 'fridge'

const VALUES: ReadonlySet<StorageLocationValue> = new Set(['pantry', 'fridge'])

export class InvalidStorageLocationError extends Error {
  override readonly name = 'InvalidStorageLocationError'
  constructor(value: string) {
    super(`Invalid storage location: "${value}". Expected "pantry" or "fridge".`)
  }
}

export class StorageLocation {
  private constructor(readonly value: StorageLocationValue) {}

  static fromString(value: string): StorageLocation {
    if (!VALUES.has(value as StorageLocationValue)) {
      throw new InvalidStorageLocationError(value)
    }
    return new StorageLocation(value as StorageLocationValue)
  }

  static pantry(): StorageLocation {
    return new StorageLocation('pantry')
  }

  static fridge(): StorageLocation {
    return new StorageLocation('fridge')
  }

  equals(other: StorageLocation): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
