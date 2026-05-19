import type {
  BarcodeResolution,
  IBarcodeResolver,
} from '../../../../server/contexts/inventory/domain/ports/barcode-resolver'

/**
 * In-memory fake of `IBarcodeResolver`, keyed by `(householdId, barcode)`.
 * Used by `ConsumeInventoryItemByBarcodeUseCase` integration tests.
 */
export class InMemoryBarcodeResolver implements IBarcodeResolver {
  private readonly store = new Map<string, BarcodeResolution>()

  add(householdId: string, barcode: string, resolution: BarcodeResolution): void {
    this.store.set(`${householdId}|${barcode}`, resolution)
  }

  async resolve(barcode: string, householdId: string): Promise<BarcodeResolution | null> {
    return this.store.get(`${householdId}|${barcode}`) ?? null
  }
}
