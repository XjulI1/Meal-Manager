<script setup lang="ts">
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

const state = reactive<CreateInventoryItemDto>({
  name: props.initial?.name ?? '',
  quantity: props.initial?.quantity ?? { value: 0, unit: 'g' },
  location: props.initial?.location ?? props.defaultLocation ?? 'pantry',
})

const locationOptions = [
  { label: 'Placard', value: 'pantry' },
  { label: 'Frigo', value: 'fridge' },
]

function onSubmit() {
  if (!state.name.trim()) return
  emit('submit', {
    name: state.name.trim(),
    quantity: state.quantity,
    location: state.location,
  })
}
</script>

<template>
  <UForm :state="state" class="space-y-4" @submit.prevent="onSubmit">
    <UFormField label="Nom" required>
      <UInput v-model="state.name" placeholder="Pâtes, riz, lait…" class="w-full" />
    </UFormField>

    <UFormField label="Quantité" required>
      <QuantityInput v-model="state.quantity" />
    </UFormField>

    <UFormField label="Emplacement" required>
      <USelect v-model="state.location" :items="locationOptions" class="w-full" />
    </UFormField>

    <div class="flex justify-end gap-2 pt-2">
      <UButton variant="ghost" color="neutral" @click="emit('cancel')">Annuler</UButton>
      <UButton type="submit" :loading="loading">{{ initial ? 'Enregistrer' : 'Ajouter' }}</UButton>
    </div>
  </UForm>
</template>
