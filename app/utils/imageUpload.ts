/**
 * Shared client-side image normalization for AI photo flows (recipe import,
 * wine-label scan). A picked file is normalized to an API-acceptable image:
 * HEIC/HEIF is converted to JPEG (heic-to / libheif WASM), then every image is
 * downscaled and re-encoded as JPEG so the payload stays small and within the
 * size bound. The Anthropic vision API downsamples large images anyway, so full
 * resolution only wastes payload and tokens.
 */

export type NormalizedImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp'

export interface NormalizedImage {
  mediaType: NormalizedImageMediaType
  /** Raw base64 (no `data:` prefix). */
  data: string
}

/** Read a Blob as raw base64 (strips the `data:<mime>;base64,` prefix). */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('Lecture du fichier impossible'))
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.readAsDataURL(blob)
  })
}

/** Detect HEIC/HEIF by magic bytes, falling back to MIME type / extension. */
async function detectHeic(file: File): Promise<boolean> {
  if (/image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)) return true
  try {
    const { isHeic } = await import('heic-to')
    return await isHeic(file)
  }
  catch {
    return false
  }
}

const MAX_IMAGE_EDGE = 1600
const JPEG_QUALITY = 0.85

/**
 * Downscale (never upscale) an image blob to a JPEG whose longest edge is
 * ≤ MAX_IMAGE_EDGE.
 */
async function downscaleToJpeg(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob)
  try {
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas indisponible')
    ctx.drawImage(bitmap, 0, 0, width, height)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encodage JPEG impossible'))), 'image/jpeg', JPEG_QUALITY),
    )
  }
  finally {
    bitmap.close()
  }
}

/**
 * Normalize a picked file to an API-acceptable image. HEIC/HEIF is first
 * converted to JPEG, then downscaled and re-encoded. Falls back to sending the
 * (converted) source as-is if the canvas path is unavailable.
 */
export async function normalizeImageFile(file: File): Promise<NormalizedImage> {
  let source: Blob = file
  if (await detectHeic(file)) {
    try {
      const { heicTo } = await import('heic-to')
      source = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.9 })
    }
    catch {
      throw new Error(`Impossible de convertir la photo HEIC « ${file.name} ». Réessayez ou exportez-la en JPEG.`)
    }
  }
  try {
    const jpeg = await downscaleToJpeg(source)
    return { mediaType: 'image/jpeg', data: await blobToBase64(jpeg) }
  }
  catch {
    const mediaType = (source.type || file.type) as NormalizedImageMediaType
    return { mediaType, data: await blobToBase64(source) }
  }
}
