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
      icon="i-lucide-plus"
      color="neutral"
      variant="ghost"
      type="button"
      :title="`Nouvel ingrédient`"
      @click="showQuickCreate = true"
    />

    <UModal v-model:open="showQuickCreate" title="Nouvel ingrédient">
      <template #body>
        <IngredientsIngredientForm
          compact
          :loading="submitting"
          @submit="onQuickCreate"
          @cancel="showQuickCreate = false"
        />
      </template>
    </UModal>
  </div>
</template>
