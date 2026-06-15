import type {
  RecipeDraftSummary,
  RecipeDraftView,
  SaveRecipeDraftDto,
  UpdateRecipeDraftDto,
} from '../../shared/dto/recipe-drafts'

/**
 * Client access to persisted per-household recipe drafts. Lets the recipe form
 * (manual) and the 3 AI flows (chat / URL / photo) save a work-in-progress
 * recipe server-side with the matching `source`, then resume or promote it.
 */
export function useApiRecipeDrafts() {
  function list() {
    return useFetch<RecipeDraftSummary[]>('/api/recipes/drafts', {
      default: () => [],
    })
  }

  function getById(id: Ref<string> | string) {
    return useFetch<RecipeDraftView>(() => `/api/recipes/drafts/${toValue(id)}`)
  }

  async function save(payload: SaveRecipeDraftDto): Promise<RecipeDraftView> {
    return $fetch<RecipeDraftView>('/api/recipes/drafts', {
      method: 'POST',
      body: payload,
    })
  }

  async function update(id: string, payload: UpdateRecipeDraftDto): Promise<RecipeDraftView> {
    return $fetch<RecipeDraftView>(`/api/recipes/drafts/${id}`, {
      method: 'PATCH',
      body: payload,
    })
  }

  async function remove(id: string): Promise<void> {
    await $fetch(`/api/recipes/drafts/${id}`, { method: 'DELETE' })
  }

  return { list, getById, save, update, remove }
}
