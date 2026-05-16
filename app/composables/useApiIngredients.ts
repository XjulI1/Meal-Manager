import type {
  CreateIngredientDto,
  IngredientCategory,
  IngredientStorage,
  IngredientView,
  ListIngredientsQueryDto,
  UpdateIngredientDto,
} from '../../shared/dto/ingredient'

export interface IngredientWithProductsView extends IngredientView {
  products: Array<{
    id: string
    ingredientId: string
    brand: string | null
    packSize: number
    packUnit: 'g' | 'ml' | 'unit'
    imageUrl: string | null
    barcodes: string[]
    updatedAt: string
  }>
}

export function useApiIngredients() {
  function list(query?: Ref<ListIngredientsQueryDto> | ListIngredientsQueryDto) {
    return useFetch<IngredientView[]>('/api/ingredients', {
      query,
      default: () => [],
    })
  }

  async function listOnce(query?: ListIngredientsQueryDto): Promise<IngredientView[]> {
    return $fetch<IngredientView[]>('/api/ingredients', { query: query as Record<string, unknown> })
  }

  async function get(id: string): Promise<IngredientWithProductsView> {
    return $fetch<IngredientWithProductsView>(`/api/ingredients/${id}`)
  }

  async function create(payload: CreateIngredientDto): Promise<IngredientView> {
    return $fetch<IngredientView>('/api/ingredients', { method: 'POST', body: payload })
  }

  async function update(id: string, payload: UpdateIngredientDto): Promise<IngredientView> {
    return $fetch<IngredientView>(`/api/ingredients/${id}`, { method: 'PATCH', body: payload })
  }

  async function remove(id: string): Promise<void> {
    await $fetch(`/api/ingredients/${id}`, { method: 'DELETE' })
  }

  return { list, listOnce, get, create, update, remove }
}

export const STORAGE_LABELS: Record<IngredientStorage, string> = {
  pantry: 'Placard',
  fridge: 'Frigo',
}

export const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  produce: 'Fruits & légumes',
  bakery: 'Boulangerie',
  'meat-fish': 'Viande & poisson',
  dairy: 'Crémerie',
  frozen: 'Surgelés',
  grocery: 'Épicerie',
  beverages: 'Boissons',
  household: 'Entretien',
  other: 'Autre',
}

export const CATEGORY_ORDER: IngredientCategory[] = [
  'produce',
  'bakery',
  'meat-fish',
  'dairy',
  'frozen',
  'grocery',
  'beverages',
  'household',
  'other',
]
