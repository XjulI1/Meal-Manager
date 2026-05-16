export class DuplicateBarcodeError extends Error {
  override readonly name = 'DuplicateBarcodeError'
  constructor(barcode: string) {
    super(`Barcode already attached to another product in this household: ${barcode}`)
  }
}
