import type {
  AddSlotItemDto,
  DayOfWeek,
  MealType,
  MenuSlotView,
  MenuView,
} from '../../shared/dto/menus'

export function useApiMenus() {
  function getByWeek(weekStart: Ref<string> | string) {
    return useFetch<MenuView>('/api/menus', {
      query: { weekStart },
    })
  }

  async function addSlotItem(menuId: string, payload: AddSlotItemDto): Promise<MenuSlotView> {
    return $fetch<MenuSlotView>(`/api/menus/${menuId}/slots/items`, {
      method: 'POST',
      body: payload,
    })
  }

  async function removeSlotItem(menuId: string, itemId: string): Promise<void> {
    await $fetch(`/api/menus/${menuId}/slots/items/${itemId}`, {
      method: 'DELETE',
    })
  }

  async function clearSlot(
    menuId: string,
    payload: { dayOfWeek: DayOfWeek, mealType: MealType },
  ): Promise<void> {
    await $fetch(`/api/menus/${menuId}/slots`, {
      method: 'DELETE',
      query: payload,
    })
  }

  return { getByWeek, addSlotItem, removeSlotItem, clearSlot }
}
