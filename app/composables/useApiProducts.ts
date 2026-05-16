import type {
  BarcodeResolutionView,
  CreateProductDto,
  ProductView,
  UpdateProductDto,
} from '../../shared/dto/product'

export function useApiProducts() {
  async function addToIngredient(ingredientId: string, payload: CreateProductDto): Promise<ProductView> {
    return $fetch<ProductView>(`/api/ingredients/${ingredientId}/products`, {
      method: 'POST',
      body: payload,
    })
  }

  async function get(id: string): Promise<ProductView> {
    return $fetch<ProductView>(`/api/products/${id}`)
  }

  async function update(id: string, payload: UpdateProductDto): Promise<ProductView> {
    return $fetch<ProductView>(`/api/products/${id}`, { method: 'PATCH', body: payload })
  }

  async function remove(id: string): Promise<void> {
    await $fetch(`/api/products/${id}`, { method: 'DELETE' })
  }

  async function resolveByBarcode(code: string): Promise<BarcodeResolutionView | null> {
    try {
      return await $fetch<BarcodeResolutionView>(`/api/barcodes/${encodeURIComponent(code)}`)
    }
    catch (err) {
      if ((err as { statusCode?: number }).statusCode === 404) return null
      throw err
    }
  }

  return { addToIngredient, get, update, remove, resolveByBarcode }
}
