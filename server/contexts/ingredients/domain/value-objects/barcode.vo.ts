export class InvalidBarcodeFormatError extends Error {
  override readonly name = 'InvalidBarcodeFormatError'
  constructor(value: string, reason: string) {
    super(`Invalid barcode "${value}": ${reason}`)
  }
}

/**
 * Value Object representing a GTIN barcode.
 *
 * Accepts EAN-8 (8 digits), EAN-13 (13 digits), and UPC-A (12 digits).
 * UPC-A is normalized to EAN-13 by prefixing `0`. The stored value is
 * always 8 or 13 digits and the modulo-10 GTIN checksum is verified.
 */
export class Barcode {
  private constructor(readonly value: string) {}

  static fromString(input: string): Barcode {
    const trimmed = input.trim()
    if (!/^\d+$/.test(trimmed)) {
      throw new InvalidBarcodeFormatError(input, 'must contain only digits')
    }

    let normalized: string
    switch (trimmed.length) {
      case 8:
      case 13:
        normalized = trimmed
        break
      case 12:
        normalized = `0${trimmed}` // UPC-A → EAN-13
        break
      default:
        throw new InvalidBarcodeFormatError(
          input,
          `length must be 8 (EAN-8), 12 (UPC-A) or 13 (EAN-13), got ${trimmed.length}`,
        )
    }

    if (!Barcode.isChecksumValid(normalized)) {
      throw new InvalidBarcodeFormatError(input, 'checksum digit is incorrect')
    }

    return new Barcode(normalized)
  }

  /**
   * GTIN modulo-10 check.
   *
   * Sum digits with alternating weights (rightmost data digit has weight 3,
   * then 1, then 3, …). The check digit is `(10 - sum % 10) % 10`.
   */
  private static isChecksumValid(digits: string): boolean {
    const len = digits.length
    let sum = 0
    for (let i = 0; i < len - 1; i++) {
      const d = digits.charCodeAt(i) - 48
      // Rightmost data digit (index len-2) → weight 3. Then alternate.
      const weight = (len - 2 - i) % 2 === 0 ? 3 : 1
      sum += d * weight
    }
    const expected = (10 - (sum % 10)) % 10
    const actual = digits.charCodeAt(len - 1) - 48
    return expected === actual
  }

  equals(other: Barcode): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
