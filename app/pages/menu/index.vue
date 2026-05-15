<script setup lang="ts">
import type { DayOfWeek, MealType, MenuView } from '../../../shared/dto/menus'

definePageMeta({ title: 'Menu' })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const menusApi = useApiMenus()
const recipesApi = useApiRecipes()

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

function slotFor(m: MenuView | null, day: DayOfWeek, meal: MealType) {
  if (!m) return null
  return m.slots.find((s) => s.dayOfWeek === day && s.mealType === meal) ?? null
}

const pickerOpen = ref(false)
const pickerContext = ref<{ day: DayOfWeek, meal: MealType, servings: number } | null>(null)

function openPicker(day: DayOfWeek, meal: MealType, currentServings?: number | null) {
  pickerContext.value = { day, meal, servings: currentServings ?? 2 }
  pickerOpen.value = true
}

async function onSelect(payload: { recipeId: string, servings: number }) {
  if (!menu.value || !pickerContext.value) return
  try {
    await menusApi.assignSlot(menu.value.id, {
      dayOfWeek: pickerContext.value.day,
      mealType: pickerContext.value.meal,
      recipeId: payload.recipeId,
      servings: payload.servings,
    })
    pickerOpen.value = false
    await refreshMenu()
  }
  catch (error) {
    toast.add({
      title: (error as { statusMessage?: string }).statusMessage ?? 'Action impossible',
      color: 'error',
    })
  }
}

async function clearSlot(day: DayOfWeek, meal: MealType) {
  if (!menu.value) return
  try {
    await menusApi.clearSlot(menu.value.id, { dayOfWeek: day, mealType: meal })
    await refreshMenu()
  }
  catch (error) {
    toast.add({
      title: (error as { statusMessage?: string }).statusMessage ?? 'Action impossible',
      color: 'error',
    })
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
                v-if="slotFor(menu, day.value, meal.value)?.recipeId"
                class="rounded-md border border-gray-200 dark:border-gray-800 p-2 bg-white dark:bg-gray-950 flex flex-col gap-1"
              >
                <button
                  type="button"
                  class="text-sm font-medium text-left hover:underline truncate"
                  @click="openPicker(day.value, meal.value, slotFor(menu, day.value, meal.value)?.servings)"
                >
                  {{ recipeById.get(slotFor(menu, day.value, meal.value)!.recipeId!)?.title ?? 'Recette' }}
                </button>
                <div class="flex items-center justify-between">
                  <span class="text-xs text-gray-500">
                    {{ slotFor(menu, day.value, meal.value)?.servings }} port.
                  </span>
                  <UButton
                    icon="i-lucide-x"
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    @click="clearSlot(day.value, meal.value)"
                  />
                </div>
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
      :default-servings="pickerContext?.servings"
      @select="onSelect"
    />
  </div>
</template>
