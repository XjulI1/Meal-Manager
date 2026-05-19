/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBarcodeScanner } from '../../../app/composables/useBarcodeScanner'

// Track all dynamic imports of @zxing/browser to assert the native path
// short-circuits the fallback.
const zxingMock = vi.fn()
vi.mock('@zxing/browser', () => {
  zxingMock()
  return {
    BrowserMultiFormatReader: class {
      decodeFromVideoDevice() {
        return Promise.resolve({ stop: () => {} })
      }
      reset() {}
    },
  }
})

class MockBarcodeDetector {
  static formats: string[] = []
  constructor(opts: { formats: string[] }) {
    MockBarcodeDetector.formats = opts.formats
  }
  async detect() {
    return [{ rawValue: '3038359002564' }]
  }
}

function setupSecureContext() {
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true })
}

function setupMediaDevices() {
  const fakeTrack = { stop: vi.fn() }
  const fakeStream: MediaStream = { getTracks: () => [fakeTrack as unknown as MediaStreamTrack] } as MediaStream
  ;(navigator as unknown as { mediaDevices: object }).mediaDevices = {
    getUserMedia: vi.fn().mockResolvedValue(fakeStream),
  }
}

describe('useBarcodeScanner', () => {
  beforeEach(() => {
    zxingMock.mockClear()
    setupSecureContext()
    setupMediaDevices()
  })

  afterEach(() => {
    // Clean up any window-level mocks added by individual tests.
    delete (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector
  })

  it('uses native BarcodeDetector when available and never imports the zxing fallback', async () => {
    ;(window as unknown as { BarcodeDetector: typeof MockBarcodeDetector }).BarcodeDetector = MockBarcodeDetector

    const scanner = useBarcodeScanner()
    const video = document.createElement('video')
    // play() is not implemented in jsdom — stub it to resolve.
    video.play = vi.fn().mockResolvedValue(undefined)

    await scanner.start(video)

    expect(scanner.state.value).toBe('scanning')
    expect(MockBarcodeDetector.formats).toEqual(['ean_13', 'ean_8', 'upc_a'])
    expect(zxingMock).not.toHaveBeenCalled()
    scanner.stop()
  })

  it('surfaces insecure-context error and does not attempt to open the camera', async () => {
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false })
    const getUserMedia = (navigator.mediaDevices as unknown as { getUserMedia: ReturnType<typeof vi.fn> }).getUserMedia

    const scanner = useBarcodeScanner()
    const video = document.createElement('video')

    await scanner.start(video)

    expect(scanner.state.value).toBe('error')
    expect(scanner.error.value).toBe('insecure-context')
    expect(getUserMedia).not.toHaveBeenCalled()
  })

  it('surfaces permission-denied when getUserMedia rejects with NotAllowedError', async () => {
    const notAllowed = Object.assign(new Error('denied'), { name: 'NotAllowedError' })
    ;(navigator.mediaDevices as unknown as { getUserMedia: ReturnType<typeof vi.fn> }).getUserMedia
      = vi.fn().mockRejectedValue(notAllowed)

    const scanner = useBarcodeScanner()
    const video = document.createElement('video')
    await scanner.start(video)

    expect(scanner.state.value).toBe('error')
    expect(scanner.error.value).toBe('permission-denied')
    expect(scanner.permission.value).toBe('denied')
  })
})
