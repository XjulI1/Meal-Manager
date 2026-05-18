import { getCurrentScope, onScopeDispose, ref, shallowRef, type Ref } from 'vue'

export type ScannerState = 'idle' | 'initializing' | 'ready' | 'scanning' | 'scanned' | 'error'
export type ScannerError = 'insecure-context' | 'permission-denied' | 'no-camera' | 'detector-failed'
export type CameraPermission = 'granted' | 'denied' | 'prompt'

interface BarcodeDetectorLike {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>
}

interface BarcodeDetectorCtor {
  new (opts: { formats: string[] }): BarcodeDetectorLike
  getSupportedFormats?: () => Promise<string[]>
}

interface ZxingControls {
  stop: () => void
}

interface ZxingReader {
  decodeFromVideoDevice: (
    deviceId: string | undefined,
    videoEl: HTMLVideoElement,
    callback: (result: { getText: () => string } | undefined) => void,
  ) => Promise<ZxingControls>
  reset?: () => void
}

const FORMATS = ['ean_13', 'ean_8', 'upc_a']

/**
 * Browser-camera barcode scanner. Prefers the native `BarcodeDetector` API
 * (Chromium on Android/desktop); falls back to a dynamically imported
 * `@zxing/browser` so it never bloats the initial bundle on devices that
 * support the native API.
 *
 * Emits a scan only after two consecutive identical reads to de-duplicate
 * false positives. There is no manual barcode entry — by product decision.
 */
export function useBarcodeScanner() {
  const state = ref<ScannerState>('idle')
  const permission = ref<CameraPermission>('prompt')
  const error = ref<ScannerError | null>(null)
  const lastCode: Ref<string | null> = ref(null)

  const stream = shallowRef<MediaStream | null>(null)
  const videoEl = shallowRef<HTMLVideoElement | null>(null)
  const rafHandle = shallowRef<number | null>(null)
  const zxingControls = shallowRef<ZxingControls | null>(null)
  const zxingReader = shallowRef<ZxingReader | null>(null)
  const lastSeen = shallowRef<string | null>(null)
  const onScanCallbacks = shallowRef<Array<(code: string) => void>>([])

  function reset() {
    lastSeen.value = null
    lastCode.value = null
    error.value = null
  }

  function onScan(callback: (code: string) => void) {
    onScanCallbacks.value = [...onScanCallbacks.value, callback]
  }

  function emit(code: string) {
    lastCode.value = code
    state.value = 'scanned'
    for (const cb of onScanCallbacks.value) cb(code)
  }

  function consider(code: string) {
    // De-duplication: require two consecutive identical reads.
    if (lastSeen.value === code) {
      emit(code)
      return
    }
    lastSeen.value = code
  }

  async function acquireStream(): Promise<MediaStream> {
    const constraints: MediaStreamConstraints[] = [
      { video: { facingMode: { exact: 'environment' } } },
      { video: { facingMode: 'environment' } },
      { video: true },
    ]
    let lastErr: unknown = null
    for (const c of constraints) {
      try {
        const s = await navigator.mediaDevices.getUserMedia(c)
        permission.value = 'granted'
        return s
      }
      catch (err) {
        lastErr = err
        const name = (err as { name?: string }).name
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          permission.value = 'denied'
          throw err
        }
      }
    }
    throw lastErr ?? new Error('Camera unavailable')
  }

  async function start(target: HTMLVideoElement) {
    state.value = 'initializing'
    error.value = null
    videoEl.value = target

    if (typeof window === 'undefined' || !window.isSecureContext) {
      state.value = 'error'
      error.value = 'insecure-context'
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      state.value = 'error'
      error.value = 'no-camera'
      return
    }

    try {
      stream.value = await acquireStream()
    }
    catch {
      state.value = 'error'
      error.value = permission.value === 'denied' ? 'permission-denied' : 'no-camera'
      return
    }

    target.srcObject = stream.value
    await target.play().catch(() => {})

    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
    if (Detector) {
      try {
        const detector = new Detector({ formats: FORMATS })
        state.value = 'scanning'
        const loop = async () => {
          if (!videoEl.value || !stream.value) return
          try {
            const results = await detector.detect(videoEl.value)
            const first = results[0]
            if (first?.rawValue) consider(first.rawValue)
          }
          catch {
            // ignore per-frame errors; the loop continues.
          }
          rafHandle.value = requestAnimationFrame(loop)
        }
        rafHandle.value = requestAnimationFrame(loop)
        return
      }
      catch {
        // Fall through to zxing fallback below if the native detector misbehaves.
      }
    }

    // Fallback: dynamic import keeps zxing out of the initial bundle.
    try {
      const mod = await import('@zxing/browser')
      const reader = new mod.BrowserMultiFormatReader() as unknown as ZxingReader
      zxingReader.value = reader
      state.value = 'scanning'
      zxingControls.value = await reader.decodeFromVideoDevice(undefined, target, (result) => {
        if (!result) return
        consider(result.getText())
      })
    }
    catch {
      state.value = 'error'
      error.value = 'detector-failed'
    }
  }

  function stop() {
    if (rafHandle.value !== null) {
      cancelAnimationFrame(rafHandle.value)
      rafHandle.value = null
    }
    if (zxingControls.value) {
      zxingControls.value.stop()
      zxingControls.value = null
    }
    if (zxingReader.value?.reset) {
      try { zxingReader.value.reset() }
      catch { /* ignore */ }
      zxingReader.value = null
    }
    if (stream.value) {
      for (const track of stream.value.getTracks()) track.stop()
      stream.value = null
    }
    if (videoEl.value) videoEl.value.srcObject = null
    videoEl.value = null
    state.value = 'idle'
  }

  if (getCurrentScope()) onScopeDispose(() => stop())

  return { state, permission, error, lastCode, start, stop, onScan, reset }
}
