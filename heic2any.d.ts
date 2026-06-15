/**
 * Minimal ambient declaration for `heic2any` (ships no types). Browser-only:
 * converts a HEIC/HEIF Blob to a supported image type (JPEG/PNG) via libheif WASM.
 */
declare module 'heic2any' {
  interface Heic2AnyOptions {
    blob: Blob
    toType?: 'image/jpeg' | 'image/png' | 'image/gif'
    quality?: number
  }
  export default function heic2any(options: Heic2AnyOptions): Promise<Blob | Blob[]>
}
