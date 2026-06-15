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

  /** Read a File as raw base64 (strips the `data:<mime>;base64,` prefix). */
  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(reader.error ?? new Error('Lecture du fichier impossible'))
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.slice(result.indexOf(',') + 1))
      }
      reader.readAsDataURL(file)
    })
  }

  /** Interpret one or more photos of the same recipe into a draft. */
  async function importPhotos(files: File[]): Promise<RecipeDraftDto> {
    const images: RecipeImageDto[] = await Promise.all(
      files.map(async (file) => ({
        mediaType: file.type as RecipeImageMediaType,
        data: await fileToBase64(file),
      })),
    )
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
