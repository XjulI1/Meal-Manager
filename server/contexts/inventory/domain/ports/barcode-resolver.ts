/**
 * Future-proofing port for barcode scanning. v1 has no implementation; this
 * interface exists so adapters (OpenFoodFacts, …) can be plugged later
 * without touching the domain.
 */
export interface BarcodeResolution {
  name: string
  defaultUnit?: string
}

export interface IBarcodeResolver {
  resolve(barcode: string): Promise<BarcodeResolution | null>
}
