import type {
  ChatMessageDto,
  DraftResolutionDto,
  RecipeDraftDto,
  RecipeImageDto,
  RecipeImageMediaType,
} from '../../shared/dto/recipe-chat'

export interface ChatSource {
  title?: string
  url: string
}

export type RecipeChatStreamEvent =
  | { type: 'text', text: string }
  | { type: 'sources', sources: ChatSource[] }
  | { type: 'draft', draft: RecipeDraftDto }
  | { type: 'error', message: string }

/** Pre-fill payload handed off from the assistant to the recipe form. */
export interface RecipePrefill {
  title: string
  instructions: string
  servings: number
  rows: Array<{
    ingredientId: string | null
    quantity: { value: number, unit: string }
    /** Set for proposed-new ingredients the user must create/pick first. */
    hint?: string
  }>
}

export function useApiRecipeChat() {
  const { user } = useUserSession()
  /** UI hint; the server gate is authoritative. */
  const aiEnabled = computed(() => user.value?.aiEnabled === true)

  /**
   * Streams one assistant turn. Parses the SSE channel and invokes `onEvent`
   * for each RecipeChatEvent. Resolves when the stream ends.
   */
  async function streamChat(
    messages: ChatMessageDto[],
    onEvent: (ev: RecipeChatStreamEvent) => void,
  ): Promise<void> {
    const res = await fetch('/api/recipes/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages }),
    })
    if (!res.ok || !res.body) {
      throw createError({ statusCode: res.status, statusMessage: res.statusText || 'Chat indisponible' })
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const frames = buffer.split('\n\n')
      buffer = frames.pop() ?? ''
      for (const frame of frames) {
        const dataLine = frame.split('\n').find((l) => l.startsWith('data:'))
        if (!dataLine) continue
        const json = dataLine.slice('data:'.length).trim()
        if (!json) continue
        try {
          onEvent(JSON.parse(json) as RecipeChatStreamEvent)
        }
        catch {
          // Ignore malformed frame.
        }
      }
    }
  }

  async function importUrl(url: string): Promise<RecipeDraftDto> {
    return $fetch<RecipeDraftDto>('/api/recipes/import', { method: 'POST', body: { url } })
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

  /**
   * Downscale (never upscale) an image blob to a JPEG whose longest edge is
   * ≤ MAX_IMAGE_EDGE. Keeps the upload small and well within the size bound;
   * the vision API downsamples large images anyway, so full resolution wastes
   * payload and tokens.
   */
  const MAX_IMAGE_EDGE = 2000
  const JPEG_QUALITY = 0.85

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
   * Normalize a picked file to an API-acceptable image: HEIC/HEIF is first
   * converted to JPEG (heic-to / libheif WASM), then every image is downscaled
   * and re-encoded as JPEG so the payload stays small. Falls back to sending the
   * (converted) source as-is if the canvas path is unavailable.
   */
  async function toApiImage(file: File): Promise<RecipeImageDto> {
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
      const mediaType = (source.type || file.type) as RecipeImageMediaType
      return { mediaType, data: await blobToBase64(source) }
    }
  }

  /** Interpret one or more photos of the same recipe into a draft. */
  async function importPhotos(files: File[]): Promise<RecipeDraftDto> {
    const images: RecipeImageDto[] = await Promise.all(files.map(toApiImage))
    return $fetch<RecipeDraftDto>('/api/recipes/import-photo', { method: 'POST', body: { images } })
  }

  async function resolveDraft(draft: RecipeDraftDto): Promise<DraftResolutionDto> {
    return $fetch<DraftResolutionDto>('/api/recipes/draft/resolve', { method: 'POST', body: { draft } })
  }

  /** Build the recipe-form pre-fill from a catalog resolution. */
  function toPrefill(resolution: DraftResolutionDto): RecipePrefill {
    return {
      title: resolution.title,
      instructions: resolution.instructions,
      servings: resolution.servings ?? 2,
      rows: resolution.ingredients.map((ing) => {
        // Use the canonical unit (safe for QuantityInput); the user reviews values.
        const unit = ing.canonicalUnit
        const value = ing.quantity?.value ?? 0
        if (ing.status === 'matched') {
          return { ingredientId: ing.ingredientId, quantity: { value, unit } }
        }
        return {
          ingredientId: null,
          quantity: { value, unit },
          hint: `À créer : « ${ing.proposedName} » (${ing.canonicalUnit})`,
        }
      }),
    }
  }

  return { aiEnabled, streamChat, importUrl, importPhotos, resolveDraft, toPrefill }
}

/** Shared handoff slot so the chat page can pre-fill /recipes/new. */
export function useRecipePrefill() {
  return useState<RecipePrefill | null>('recipe-prefill', () => null)
}
