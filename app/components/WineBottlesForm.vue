<script setup lang="ts">
import type { AddBottlesDto } from '../../shared/dto/wine-cellar'

defineProps<{
  wineName?: string
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: AddBottlesDto]
  cancel: []
}>()

const quantity = ref(1)
const sizeKey = ref('75cl')
const buyingPrice = ref<number | null>(null)
const addedDate = ref('')

function onSubmit() {
  const size = BOTTLE_SIZE_OPTIONS.find((o) => o.value === sizeKey.value)?.size
  emit('submit', {
    quantity: Math.max(1, Math.round(quantity.value || 1)),
    size,
    buyingPrice: buyingPrice.value ?? undefined,
    addedDate: addedDate.value ? addedDate.value : undefined,
  })
}
</script>

<template>
  <UForm :state="{ quantity }" class="space-y-4" @submit.prevent="onSubmit">
    <p v-if="wineName" class="text-sm text-gray-500">Ajout de bouteilles pour <strong>{{ wineName }}</strong>.</p>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UFormField label="Nombre de bouteilles" required>
        <UInput v-model.number="quantity" type="number" min="1" class="w-full" />
      </UFormField>
      <UFormField label="Contenance">
        <USelect v-model="sizeKey" :items="BOTTLE_SIZE_OPTIONS" class="w-full" />
      </UFormField>
      <UFormField label="Prix d'achat (€)">
        <UInput v-model.number="buyingPrice" type="number" step="0.01" min="0" class="w-full" placeholder="24.00" />
      </UFormField>
      <UFormField label="Date d'ajout">
        <UInput v-model="addedDate" type="date" class="w-full" />
      </UFormField>
    </div>

    <p class="text-xs text-gray-500">
      Les bouteilles arrivent dans le pool « à ranger ». Vous les placerez ensuite dans la cave.
    </p>

    <div class="flex justify-end gap-2 pt-2">
      <UButton variant="ghost" color="neutral" @click="emit('cancel')">Annuler</UButton>
      <UButton type="submit" :loading="loading">Ajouter</UButton>
    </div>
  </UForm>
</template>
