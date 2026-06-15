import type { RecipeDraftSourceDto, UpdateRecipeDraftDto } from '../../shared/dto/recipe-drafts'

/** Loose draft content built from the recipe form (free-text ingredients). */
export type RecipeDraftContent = UpdateRecipeDraftDto

const SAVE_DEBOUNCE_MS = 700

/**
 * Server-side autosave for a recipe being written. There is NO save button:
 * the first meaningful change creates a draft, every later change patches it
 * (debounced + coalesced), and the draft is only removed on an explicit
 * discard — or silently on `promote()` once the recipe has been created.
 */
export function useRecipeDraftSync(source: RecipeDraftSourceDto, initialDraftId?: string | null) {
  const api = useApiRecipeDrafts()
  const draftId = ref<string | null>(initialDraftId ?? null)
  const saving = ref(false)

  let timer: ReturnType<typeof setTimeout> | null = null
  let pending: RecipeDraftContent | null = null
  let inFlight = false

  /** Don't create an empty draft: require a title, instructions, or a named ingredient. */
  function hasContent(c: RecipeDraftContent): boolean {
    return Boolean(
      c.title?.trim()
      || c.instructions?.trim()
      || c.ingredients?.some((i) => i.name.trim().length > 0),
    )
  }

  async function flush() {
    if (inFlight || !pending) return
    const content = pending
    pending = null
    if (!draftId.value && !hasContent(content)) return

    inFlight = true
    saving.value = true
    try {
      if (!draftId.value) {
        const created = await api.save({ source, ...content })
        draftId.value = created.id
      }
      else {
        await api.update(draftId.value, content)
      }
    }
    catch {
      // Keep the latest content so the next change retries; autosave is best-effort.
    }
    finally {
      inFlight = false
      saving.value = false
      // Coalesce changes that arrived while the request was in flight.
      if (pending) scheduleFlush()
    }
  }

  function scheduleFlush() {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void flush(), SAVE_DEBOUNCE_MS)
  }

  /** Record the current form content; persists after a short debounce. */
  function schedule(content: RecipeDraftContent) {
    pending = content
    scheduleFlush()
  }

  function cancelPending() {
    if (timer) clearTimeout(timer)
    timer = null
    pending = null
  }

  /** Explicit "ne pas garder" — deletes the draft for good. */
  async function discard(): Promise<void> {
    cancelPending()
    const id = draftId.value
    draftId.value = null
    if (id) await api.remove(id)
  }

  /** Called once the recipe has been created from this draft — drop the draft. */
  async function promote(): Promise<void> {
    cancelPending()
    const id = draftId.value
    draftId.value = null
    if (id) await api.remove(id).catch(() => {})
  }

  onBeforeUnmount(cancelPending)

  return { draftId, saving, schedule, discard, promote }
}
