import type {
  AddFromScanInput,
  AddFromScanResponse,
  ConsumeByBarcodeInput,
  ConsumePreviewResponse,
  ConsumeResponse,
  ScanResult,
} from '../../shared/dto/scan.dto'

/**
 * Front composable for the three scan flows. Wraps the existing
 * `GET /api/barcodes/:code` (resolve) plus the new
 * `POST /api/inventory/from-scan` and `POST /api/inventory/consume-by-barcode`.
 */
export function useApiBarcodes() {
  async function resolve(code: string): Promise<ScanResult | null> {
    try {
      return await $fetch<ScanResult>(`/api/barcodes/${encodeURIComponent(code)}`)
    }
    catch (err) {
      if ((err as { statusCode?: number }).statusCode === 404) return null
      throw err
    }
  }

  async function addFromScan(input: AddFromScanInput): Promise<AddFromScanResponse> {
    return $fetch<AddFromScanResponse>('/api/inventory/from-scan', {
      method: 'POST',
      body: input,
    })
  }

  async function consumeByBarcode(
    input: ConsumeByBarcodeInput & { preview: true },
  ): Promise<ConsumePreviewResponse>
  async function consumeByBarcode(
    input: ConsumeByBarcodeInput & { preview?: false | undefined },
  ): Promise<ConsumeResponse>
  async function consumeByBarcode(
    input: ConsumeByBarcodeInput,
  ): Promise<ConsumeResponse | ConsumePreviewResponse> {
    return $fetch('/api/inventory/consume-by-barcode', {
      method: 'POST',
      body: input,
    })
  }

  return { resolve, addFromScan, consumeByBarcode }
}
