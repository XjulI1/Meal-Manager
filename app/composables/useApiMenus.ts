import type {
  AssignRecipeToSlotDto,
  DayOfWeek,
  MealType,
  MenuView,
} from '../../shared/dto/menus'

export function useApiMenus() {
  function getByWeek(weekStart: Ref<string> | string) {
    return useFetch<MenuView>('/api/menus', {
      query: { weekStart },
    })
  }

  async function assignSlot(menuId: string, payload: AssignRecipeToSlotDto): Promise<MenuView> {
    return $fetch<MenuView>(`/api/menus/${menuId}/slots`, {
      method: 'POST',
      body: payload,
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

  return { getByWeek, assignSlot, clearSlot }
}
