import type { GenerateShoppingListDto, ShoppingListView } from '../../shared/dto/shopping'

export function useApiShopping() {
  async function generate(payload: GenerateShoppingListDto): Promise<ShoppingListView> {
    return $fetch<ShoppingListView>('/api/shopping-lists', {
      method: 'POST',
      body: payload,
    })
  }

  async function fetchByMenu(menuId: string): Promise<ShoppingListView | null> {
    try {
      return await $fetch<ShoppingListView>('/api/shopping-lists', {
        query: { menuId },
      })
    }
    catch (error) {
      const status = (error as { statusCode?: number }).statusCode
      if (status === 404) return null
      throw error
    }
  }

  async function toggleItem(
    snapshotId: string,
    itemId: string,
    isChecked: boolean,
  ): Promise<void> {
    await $fetch(`/api/shopping-lists/${snapshotId}/items/${itemId}`, {
      method: 'PATCH',
      body: { isChecked },
    })
  }

  return { generate, fetchByMenu, toggleItem }
}
