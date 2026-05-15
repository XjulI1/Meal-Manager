import type { CreateRecipeDto, RecipeView, UpdateRecipeDto } from '../../shared/dto/recipes'

export interface RecipeSummary {
  id: string
  title: string
  servings: number
  updatedAt: string
}

export function useApiRecipes() {
  function list(query?: Ref<string | undefined> | string) {
    return useFetch<RecipeSummary[]>('/api/recipes', {
      query: { q: query },
      default: () => [],
    })
  }

  function getById(id: Ref<string> | string) {
    return useFetch<RecipeView>(() => `/api/recipes/${toValue(id)}`)
  }

  async function create(payload: CreateRecipeDto): Promise<RecipeView> {
    return $fetch<RecipeView>('/api/recipes', {
      method: 'POST',
      body: payload,
    })
  }

  async function update(id: string, payload: UpdateRecipeDto): Promise<RecipeView> {
    return $fetch<RecipeView>(`/api/recipes/${id}`, {
      method: 'PATCH',
      body: payload,
    })
  }

  async function remove(id: string): Promise<void> {
    await $fetch(`/api/recipes/${id}`, { method: 'DELETE' })
  }

  return { list, getById, create, update, remove }
}
