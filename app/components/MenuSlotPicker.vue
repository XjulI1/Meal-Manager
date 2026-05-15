<script setup lang="ts">
const props = defineProps<{
  open: boolean
  defaultServings?: number
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  'select': [payload: { recipeId: string, servings: number }]
}>()

const api = useApiRecipes()
const search = ref('')
const { data: recipes, pending } = api.list(search)

const selectedId = ref<string | null>(null)
const servings = ref<number>(props.defaultServings ?? 2)

watch(() => props.open, (open) => {
  if (open) {
    selectedId.value = null
    servings.value = props.defaultServings ?? 2
    search.value = ''
  }
})

function confirm() {
  if (!selectedId.value) return
  emit('select', { recipeId: selectedId.value, servings: Number(servings.value) || 1 })
}
</script>

<template>
  <UModal
    :open="open"
    title="Choisir une recette"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="space-y-3">
        <UInput
          v-model="search"
          placeholder="Rechercher…"
          icon="i-lucide-search"
          class="w-full"
        />
        <div class="max-h-72 overflow-y-auto border border-gray-200 dark:border-gray-800 rounded-md divide-y divide-gray-200 dark:divide-gray-800">
          <div v-if="pending && !recipes?.length" class="p-4 text-center text-gray-500 text-sm">
            Chargement…
          </div>
          <div v-else-if="!recipes?.length" class="p-4 text-center text-gray-500 text-sm">
            Aucune recette.
          </div>
          <button
            v-for="recipe in recipes"
            :key="recipe.id"
            type="button"
            class="w-full text-left px-3 py-2 flex items-center gap-3"
            :class="selectedId === recipe.id ? 'bg-primary-50 dark:bg-primary-950' : 'hover:bg-gray-50 dark:hover:bg-gray-900'"
            @click="selectedId = recipe.id"
          >
            <UIcon
              :name="selectedId === recipe.id ? 'i-lucide-check-circle' : 'i-lucide-circle'"
              class="size-4"
              :class="selectedId === recipe.id ? 'text-primary-600' : 'text-gray-400'"
            />
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">{{ recipe.title }}</p>
              <p class="text-xs text-gray-500">{{ recipe.servings }} portion(s)</p>
            </div>
          </button>
        </div>
        <UFormField label="Portions">
          <UInput v-model.number="servings" type="number" min="1" max="50" class="w-full" />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" color="neutral" @click="emit('update:open', false)">Annuler</UButton>
        <UButton :disabled="!selectedId" @click="confirm">Assigner</UButton>
      </div>
    </template>
  </UModal>
</template>
