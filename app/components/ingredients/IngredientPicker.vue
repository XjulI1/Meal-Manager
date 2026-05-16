<script setup lang="ts">
import type { CreateIngredientDto, IngredientView } from '../../../shared/dto/ingredient'
import { CATEGORY_LABELS, STORAGE_LABELS } from '../../composables/useApiIngredients'

const props = defineProps<{
  /** Currently selected ingredientId (v-model). */
  modelValue: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [id: string | null]
  /** Emitted after a quick-create completes, so the parent can refresh related state. */
  'ingredient-created': [ingredient: IngredientView]
}>()

const api = useApiIngredients()
const toast = useToast()

const { data: ingredients, refresh, pending } = api.list()

const showQuickCreate = ref(false)
const submitting = ref(false)

const options = computed(() =>
  (ingredients.value ?? [])
    .filter((i) => !i.archived)
    .map((i) => ({
      label: i.name,
      value: i.id,
      caption: `${CATEGORY_LABELS[i.category]} · ${STORAGE_LABELS[i.storage]}`,
    })),
)

const selectedIngredient = computed(() =>
  (ingredients.value ?? []).find((i) => i.id === props.modelValue) ?? null,
)

defineExpose({ selectedIngredient })

function onSelect(id: string | null) {
  emit('update:modelValue', id)
}

async function onQuickCreate(payload: CreateIngredientDto) {
  submitting.value = true
  try {
    const created = await api.create(payload)
    toast.add({ title: 'Ingrédient créé', color: 'success' })
    showQuickCreate.value = false
    await refresh()
    emit('update:modelValue', created.id)
    emit('ingredient-created', created)
  }
  catch (error) {
    toast.add({
      title: (error as { statusMessage?: string }).statusMessage ?? 'Création impossible',
      color: 'error',
    })
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex gap-2 items-start">
      <USelectMenu
        :model-value="modelValue"
        :items="options"
        value-key="value"
        label-key="label"
        :loading="pending"
        placeholder="Choisir un ingrédient…"
        class="flex-1"
        searchable
        @update:model-value="onSelect"
      />
      <UButton
        :icon="showQuickCreate ? 'i-lucide-x' : 'i-lucide-plus'"
        :color="showQuickCreate ? 'neutral' : 'primary'"
        :variant="showQuickCreate ? 'soft' : 'solid'"
        type="button"
        :title="showQuickCreate ? 'Annuler' : 'Nouvel ingrédient'"
        @click="showQuickCreate = !showQuickCreate"
      />
    </div>

    <!-- Inline quick-create panel: avoids nesting a modal inside another modal,
         which broke the inner form's submit event when used inside InventoryItemForm
         or RecipeForm modals (focus trap interference). -->
    <div
      v-if="showQuickCreate"
      class="border border-dashed border-gray-300 dark:border-gray-700 rounded-md p-3 bg-gray-50 dark:bg-gray-900"
    >
      <p class="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
        Nouvel ingrédient
      </p>
      <IngredientsIngredientForm
        compact
        :loading="submitting"
        @submit="onQuickCreate"
        @cancel="showQuickCreate = false"
      />
    </div>
  </div>
</template>
