/**
 * Raised by `ConsumeInventoryItemByBarcodeUseCase` when the requested quantity
 * exceeds the total available across all inventory lines of the resolved
 * ingredient. No state is modified.
 */
export class InsufficientQuantityError extends Error {
  override readonly name = 'InsufficientQuantityError'
  constructor(
    readonly requested: number,
    readonly available: number,
    readonly unit: string,
  ) {
    super(
      `Requested quantity ${requested}${unit} exceeds available ${available}${unit}.`,
    )
  }
}
