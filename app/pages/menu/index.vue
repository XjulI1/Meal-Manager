<script setup lang="ts">
import type { DayOfWeek, MealType, MenuSlotView, MenuView } from '../../../shared/dto/menus'

definePageMeta({ title: 'Menu' })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const menusApi = useApiMenus()
const recipesApi = useApiRecipes()
const ingredientsApi = useApiIngredients()

const queryWeek = computed(() => {
  const w = route.query.weekStart
  return typeof w === 'string' ? w : ''
})

const weekStart = ref<string>(queryWeek.value || currentMondayIso())

watch(weekStart, (value) => {
  router.replace({ query: { ...route.query, weekStart: value } })
})

const { data: menu, refresh: refreshMenu, pending: menuPending } = menusApi.getByWeek(weekStart)
const { data: recipes } = recipesApi.list()
const { data: ingredients } = ingredientsApi.list()

const days: { value: DayOfWeek, offset: number }[] = [
  { value: 'monday', offset: 0 },
  { value: 'tuesday', offset: 1 },
  { value: 'wednesday', offset: 2 },
  { value: 'thursday', offset: 3 },
  { value: 'friday', offset: 4 },
  { value: 'saturday', offset: 5 },
  { value: 'sunday', offset: 6 },
]
const meals: { value: MealType, label: string }[] = [
  { value: 'breakfast', label: 'Petit-déjeuner' },
  { value: 'lunch', label: 'Déjeuner' },
  { value: 'dinner', label: 'Dîner' },
]

const recipeById = computed<Map<string, { id: string, title: string }>>(() => {
  const map = new Map<string, { id: string, title: string }>()
  for (const r of recipes.value ?? []) {
    map.set(r.id, { id: r.id, title: r.title })
  }
  return map
})

const ingredientById = computed<Map<string, { id: string, name: string, canonicalUnit: string }>>(() => {
  const map = new Map<string, { id: string, name: string, canonicalUnit: string }>()
  for (const i of ingredients.value ?? []) {
    map.set(i.id, { id: i.id, name: i.name, canonicalUnit: i.canonicalUnit })
  }
  return map
})

function slotFor(m: MenuView | null, day: DayOfWeek, meal: MealType): MenuSlotView | null {
  if (!m) return null
  return m.slots.find((s) => s.dayOfWeek === day && s.mealType === meal) ?? null
}

function recipeItemOf(slot: MenuSlotView | null) {
  return slot?.items.find((i) => i.kind === 'recipe') ?? null
}

function ingredientItemsOf(slot: MenuSlotView | null) {
  return slot?.items.filter((i) => i.kind === 'ingredient') ?? []
}

const pickerOpen = ref(false)
const pickerContext = ref<{ day: DayOfWeek, meal: MealType } | null>(null)

const pickerSlot = computed(() => pickerContext.value ? slotFor(menu.value, pickerContext.value.day, pickerContext.value.meal) : null)

function openPicker(day: DayOfWeek, meal: MealType) {
  pickerContext.value = { day, meal }
  pickerOpen.value = true
}

function reportError(error: unknown, fallback: string) {
  toast.add({
    title: (error as { statusMessage?: string }).statusMessage ?? fallback,
    color: 'error',
  })
}

async function onAddRecipe(payload: { recipeId: string, servings: number }) {
  if (!menu.value || !pickerContext.value) return
  try {
    await menusApi.addSlotItem(menu.value.id, {
      dayOfWeek: pickerContext.value.day,
      mealType: pickerContext.value.meal,
      kind: 'recipe',
      recipeId: payload.recipeId,
      servings: payload.servings,
    })
    await refreshMenu()
  }
  catch (error) {
    reportError(error, 'Action impossible')
  }
}

async function onAddIngredient(payload: { ingredientId: string, quantity: { value: number, unit: string } }) {
  if (!menu.value || !pickerContext.value) return
  try {
    await menusApi.addSlotItem(menu.value.id, {
      dayOfWeek: pickerContext.value.day,
      mealType: pickerContext.value.meal,
      kind: 'ingredient',
      ingredientId: payload.ingredientId,
      quantity: payload.quantity,
    })
    await refreshMenu()
  }
  catch (error) {
    reportError(error, 'Action impossible')
  }
}

async function onRemoveItem(itemId: string) {
  if (!menu.value) return
  try {
    await menusApi.removeSlotItem(menu.value.id, itemId)
    await refreshMenu()
  }
  catch (error) {
    reportError(error, 'Action impossible')
  }
}

async function clearSlot(day: DayOfWeek, meal: MealType) {
  if (!menu.value) return
  try {
    await menusApi.clearSlot(menu.value.id, { dayOfWeek: day, mealType: meal })
    await refreshMenu()
  }
  catch (error) {
    reportError(error, 'Action impossible')
  }
}

function shift(weeks: number) {
  weekStart.value = shiftWeek(weekStart.value, weeks)
}

function goToday() {
  weekStart.value = currentMondayIso()
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <h1 class="text-2xl font-semibold">Menu hebdomadaire</h1>
      <div class="flex items-center gap-2">
        <UButton icon="i-lucide-chevron-left" color="neutral" variant="ghost" @click="shift(-1)" />
        <UButton color="neutral" variant="soft" @click="goToday">Aujourd’hui</UButton>
        <UButton icon="i-lucide-chevron-right" color="neutral" variant="ghost" @click="shift(1)" />
      </div>
    </div>
    <p class="text-sm text-gray-500">Semaine du {{ formatWeekRange(weekStart) }}</p>

    <UButton
      v-if="menu"
      :to="`/shopping?menuId=${menu.id}`"
      icon="i-lucide-shopping-cart"
      variant="soft"
    >
      Liste de courses
    </UButton>

    <div v-if="menuPending && !menu" class="p-8 text-center text-gray-500">Chargement…</div>

    <div v-else-if="menu" class="overflow-x-auto">
      <table class="min-w-full border-collapse">
        <thead>
          <tr>
            <th class="text-left text-sm font-medium text-gray-500 p-2 w-32">Jour</th>
            <th
              v-for="meal in meals"
              :key="meal.value"
              class="text-left text-sm font-medium text-gray-500 p-2"
            >
              {{ meal.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="day in days"
            :key="day.value"
            class="border-t border-gray-200 dark:border-gray-800"
          >
            <td class="p-2 text-sm font-medium capitalize whitespace-nowrap">
              {{ formatDayLabel(weekStart, day.offset) }}
            </td>
            <td
              v-for="meal in meals"
              :key="meal.value"
              class="p-2 align-top"
            >
              <div
                v-if="slotFor(menu, day.value, meal.value)"
                class="rounded-md border border-gray-200 dark:border-gray-800 p-2 bg-white dark:bg-gray-950 flex flex-col gap-1"
              >
                <div class="flex items-start justify-between gap-1">
                  <button
                    type="button"
                    class="text-sm font-medium text-left hover:underline"
                    @click="openPicker(day.value, meal.value)"
                  >
                    <template v-if="recipeItemOf(slotFor(menu, day.value, meal.value))">
                      {{ recipeById.get(recipeItemOf(slotFor(menu, day.value, meal.value))!.recipeId)?.title ?? 'Recette' }}
                      <span class="block text-xs text-gray-500 font-normal">
                        {{ recipeItemOf(slotFor(menu, day.value, meal.value))!.servings }} port.
                      </span>
                    </template>
                    <template v-else>
                      + Composer
                    </template>
                  </button>
                  <UButton
                    icon="i-lucide-x"
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    @click="clearSlot(day.value, meal.value)"
                  />
                </div>
                <ul v-if="ingredientItemsOf(slotFor(menu, day.value, meal.value)).length" class="text-xs text-gray-500 space-y-0.5">
                  <li
                    v-for="item in ingredientItemsOf(slotFor(menu, day.value, meal.value))"
                    :key="item.id"
                  >
                    {{ item.kind === 'ingredient' ? (ingredientById.get(item.ingredientId)?.name ?? 'Ingrédient') : '' }}
                    <template v-if="item.kind === 'ingredient'">— {{ item.quantity.value }} {{ item.quantity.unit }}</template>
                  </li>
                </ul>
              </div>
              <button
                v-else
                type="button"
                class="w-full rounded-md border border-dashed border-gray-300 dark:border-gray-700 p-2 text-sm text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900"
                @click="openPicker(day.value, meal.value)"
              >
                + Ajouter
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <MenuSlotPicker
      v-model:open="pickerOpen"
      :slot-view="pickerSlot"
      :recipe-by-id="recipeById"
      :ingredient-by-id="ingredientById"
      @add-recipe="onAddRecipe"
      @add-ingredient="onAddIngredient"
      @remove-item="onRemoveItem"
    />
  </div>
</template>
