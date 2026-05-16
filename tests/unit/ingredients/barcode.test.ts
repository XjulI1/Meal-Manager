import { describe, expect, it } from 'vitest'
import { Barcode, InvalidBarcodeFormatError } from '../../../server/contexts/ingredients/domain/value-objects/barcode.vo'

describe('Barcode', () => {
  describe('EAN-13', () => {
    it('accepts a valid EAN-13 and keeps it as-is', () => {
      const b = Barcode.fromString('3038359002564')
      expect(b.value).toBe('3038359002564')
    })

    it('rejects an EAN-13 with wrong checksum', () => {
      expect(() => Barcode.fromString('3038359002565')).toThrow(InvalidBarcodeFormatError)
    })
  })

  describe('EAN-8', () => {
    it('accepts a valid EAN-8', () => {
      const b = Barcode.fromString('73513537')
      expect(b.value).toBe('73513537')
    })

    it('rejects an EAN-8 with wrong checksum', () => {
      expect(() => Barcode.fromString('73513538')).toThrow(InvalidBarcodeFormatError)
    })
  })

  describe('UPC-A', () => {
    it('normalizes a valid 12-digit UPC-A to EAN-13 by prefixing 0', () => {
      const b = Barcode.fromString('036000291452')
      expect(b.value).toBe('0036000291452')
    })

    it('rejects a UPC-A with wrong checksum', () => {
      expect(() => Barcode.fromString('036000291451')).toThrow(InvalidBarcodeFormatError)
    })
  })

  describe('input normalization', () => {
    it('trims leading and trailing whitespace', () => {
      const b = Barcode.fromString('  3038359002564  ')
      expect(b.value).toBe('3038359002564')
    })
  })

  describe('rejection cases', () => {
    it('rejects a short string', () => {
      expect(() => Barcode.fromString('12345')).toThrow(InvalidBarcodeFormatError)
    })

    it('rejects a string with non-digit characters', () => {
      expect(() => Barcode.fromString('303835900256A')).toThrow(InvalidBarcodeFormatError)
    })

    it('rejects a 9-digit code (no GTIN of that length)', () => {
      expect(() => Barcode.fromString('303835900')).toThrow(InvalidBarcodeFormatError)
    })

    it('rejects an empty string', () => {
      expect(() => Barcode.fromString('')).toThrow(InvalidBarcodeFormatError)
    })
  })

  describe('equality', () => {
    it('considers two normalized values equal', () => {
      const a = Barcode.fromString('036000291452') // UPC normalized
      const b = Barcode.fromString('0036000291452') // EAN-13 directly
      expect(a.equals(b)).toBe(true)
    })
  })
})
