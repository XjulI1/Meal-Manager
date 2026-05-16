<script setup lang="ts">
import type { ShoppingListItemView, ShoppingListView } from '../../../shared/dto/shopping'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../../composables/useApiIngredients'

definePageMeta({ title: 'Liste de courses' })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const menusApi = useApiMenus()
const shoppingApi = useApiShopping()

const queryMenu = computed(() => {
  const m = route.query.menuId
  return typeof m === 'string' ? m : ''
})

const weekStart = ref<string>(currentMondayIso())
const { data: menu } = menusApi.getByWeek(weekStart)

watch(menu, (m) => {
  if (m && !queryMenu.value) {
    router.replace({ query: { ...route.query, menuId: m.id } })
  }
}, { immediate: true })

const list = ref<ShoppingListView | null>(null)
const loading = ref(false)
const generating = ref(false)

async function load() {
  if (!menu.value) return
  loading.value = true
  try {
    list.value = await shoppingApi.fetchByMenu(menu.value.id)
  }
  finally {
    loading.value = false
  }
}

watch(menu, async (m) => {
  if (m) await load()
}, { immediate: true })

async function generate(reuse = false) {
  if (!menu.value) return
  generating.value = true
  try {
    list.value = await shoppingApi.generate({ menuId: menu.value.id, reuse })
    toast.add({ title: 'Liste générée', color: 'success' })
  }
  catch (error) {
    toast.add({
      title: (error as { statusMessage?: string }).statusMessage ?? 'Génération impossible',
      color: 'error',
    })
  }
  finally {
    generating.value = false
  }
}

interface AisleGroup {
  category: string
  label: string
  items: ShoppingListItemView[]
}

const grouped = computed<AisleGroup[]>(() => {
  const out: AisleGroup[] = []
  const items = list.value?.items ?? []
  for (const cat of CATEGORY_ORDER) {
    const slice = items.filter((i) => i.category === cat)
    if (slice.length > 0) {
      out.push({ category: cat, label: CATEGORY_LABELS[cat], items: slice })
    }
  }
  return out
})

async function toggle(itemId: string, isChecked: boolean) {
  if (!list.value) return
  const item = list.value.items.find((i) => i.id === itemId)
  if (!item) return
  const before = item.isChecked
  item.isChecked = isChecked
  try {
    await shoppingApi.toggleItem(list.value.id, itemId, isChecked)
  }
  catch (error) {
    item.isChecked = before
    toast.add({
      title: (error as { statusMessage?: string }).statusMessage ?? 'Action impossible',
      color: 'error',
    })
  }
}
</script>

<template>
  <div class="space-y-4 max-w-3xl">
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <h1 class="text-2xl font-semibold">Liste de courses</h1>
      <div class="flex items-center gap-2">
        <UButton icon="i-lucide-chevron-left" color="neutral" variant="ghost" @click="weekStart = shiftWeek(weekStart, -1)" />
        <UButton color="neutral" variant="soft" @click="weekStart = currentMondayIso()">Cette semaine</UButton>
        <UButton icon="i-lucide-chevron-right" color="neutral" variant="ghost" @click="weekStart = shiftWeek(weekStart, 1)" />
      </div>
    </div>

    <p class="text-sm text-gray-500">Menu de la semaine du {{ formatWeekRange(weekStart) }}</p>

    <div class="flex gap-2 flex-wrap">
      <UButton
        v-if="!list"
        :loading="generating"
        :disabled="!menu"
        icon="i-lucide-sparkles"
        @click="generate(false)"
      >
        Générer depuis le menu
      </UButton>
      <UButton
        v-else
        :loading="generating"
        icon="i-lucide-refresh-cw"
        variant="soft"
        @click="generate(false)"
      >
        Régénérer
      </UButton>
    </div>

    <UCard v-if="loading && !list">
      <div class="p-8 text-center text-gray-500">Chargement…</div>
    </UCard>

    <UCard v-else-if="!list">
      <div class="p-8 text-center text-gray-500">
        Aucune liste pour cette semaine. Génère-la depuis le menu.
      </div>
    </UCard>

    <template v-else>
      <UCard v-if="!list.items.length">
        <div class="p-6 text-center text-gray-500">
          Liste vide — tout est déjà dans l’inventaire.
        </div>
      </UCard>
      <section v-for="group in grouped" :key="group.category">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">
          {{ group.label }}
        </h2>
        <UCard>
          <ul class="divide-y divide-gray-200 dark:divide-gray-800">
            <li
              v-for="item in group.items"
              :key="item.id"
              class="py-2 flex items-center gap-3"
            >
              <UCheckbox
                :model-value="item.isChecked"
                @update:model-value="(v: boolean | 'indeterminate') => toggle(item.id, v === true)"
              />
              <div class="flex-1 min-w-0" :class="item.isChecked ? 'line-through text-gray-400' : ''">
                <span class="font-medium">{{ item.ingredientName }}</span>
                <span class="text-sm text-gray-500 ml-2">
                  {{ item.quantity.value }} {{ item.quantity.unit }}
                </span>
              </div>
            </li>
          </ul>
        </UCard>
      </section>
    </template>
  </div>
</template>
