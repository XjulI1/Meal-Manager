<script setup lang="ts">
import type { CanonicalUnit, Dimension } from '../../shared/units/conversions'
import type { CreateInventoryItemDto, InventoryItemView, StorageLocation } from '../../shared/dto/inventory'

const props = defineProps<{
  initial?: InventoryItemView | null
  defaultLocation?: StorageLocation
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: CreateInventoryItemDto]
  cancel: []
}>()

const CANONICAL_TO_DIMENSION: Record<CanonicalUnit, Dimension> = {
  g: 'mass',
  ml: 'volume',
  unit: 'discrete',
}

const api = useApiIngredients()
const { data: ingredients } = api.list()

const ingredientId = ref<string | null>(props.initial?.ingredientId ?? null)
const quantity = ref(props.initial?.quantity ?? { value: 0, unit: 'g' })
const location = ref<StorageLocation>(props.initial?.location ?? props.defaultLocation ?? 'pantry')

const selectedIngredient = computed(() =>
  (ingredients.value ?? []).find((i) => i.id === ingredientId.value) ?? null,
)
const dimension = computed<Dimension | undefined>(() => {
  const u = selectedIngredient.value?.canonicalUnit
  return u ? CANONICAL_TO_DIMENSION[u] : undefined
})

const isEditing = computed(() => !!props.initial)

watch(selectedIngredient, (ing, prev) => {
  if (isEditing.value) return
  if (ing && ing.id !== prev?.id) {
    location.value = ing.storage
  }
})

const locationOptions = [
  { label: 'Placard', value: 'pantry' },
  { label: 'Frigo', value: 'fridge' },
]

function onSubmit() {
  if (!ingredientId.value) return
  emit('submit', {
    ingredientId: ingredientId.value,
    quantity: quantity.value,
    location: location.value,
  })
}
</script>

<template>
  <UForm :state="{ ingredientId, quantity, location }" class="space-y-4" @submit.prevent="onSubmit">
    <UFormField label="Ingrédient" required>
      <IngredientsIngredientPicker v-if="!isEditing" v-model="ingredientId" />
      <UInput v-else disabled :model-value="selectedIngredient?.name ?? '…'" class="w-full" />
    </UFormField>

    <UFormField label="Quantité" required>
      <QuantityInput v-model="quantity" :dimension="dimension" />
    </UFormField>

    <UFormField label="Emplacement" required help="Pré-rempli depuis l'ingrédient, modifiable.">
      <USelect v-model="location" :items="locationOptions" class="w-full" />
    </UFormField>

    <div class="flex justify-end gap-2 pt-2">
      <UButton variant="ghost" color="neutral" @click="emit('cancel')">Annuler</UButton>
      <UButton type="submit" :loading="loading" :disabled="!ingredientId">
        {{ initial ? 'Enregistrer' : 'Ajouter' }}
      </UButton>
    </div>
  </UForm>
</template>
