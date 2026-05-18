<script setup lang="ts">
import type { CanonicalUnitDto } from '../../../shared/dto/ingredient'
import type { CreateProductDto, ProductView } from '../../../shared/dto/product'

const props = defineProps<{
  /** Required when creating a new product — sets the locked packUnit. */
  ingredientCanonicalUnit: CanonicalUnitDto
  initial?: ProductView | null
  /** Pre-fills the barcode textarea on creation (e.g. from a scan). Ignored when `initial` is set. */
  initialBarcodes?: string[]
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: CreateProductDto]
  cancel: []
}>()

const state = reactive<{
  brand: string
  packSize: number
  imageUrl: string
  barcodesText: string
}>({
  brand: props.initial?.brand ?? '',
  packSize: props.initial?.packSize ?? 500,
  imageUrl: props.initial?.imageUrl ?? '',
  barcodesText: (props.initial?.barcodes ?? props.initialBarcodes ?? []).join('\n'),
})

function onSubmit() {
  const barcodes = state.barcodesText
    .split(/[\n,]/g)
    .map((b) => b.trim())
    .filter(Boolean)
  if (barcodes.length === 0) return

  emit('submit', {
    brand: state.brand.trim() || undefined,
    packSize: state.packSize,
    packUnit: props.ingredientCanonicalUnit,
    imageUrl: state.imageUrl.trim() || undefined,
    barcodes,
  })
}
</script>

<template>
  <UForm :state="state" class="space-y-4" @submit.prevent="onSubmit">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <UFormField label="Marque">
        <UInput v-model="state.brand" placeholder="Panzani, Barilla…" class="w-full" />
      </UFormField>
      <UFormField :label="`Conditionnement (${ingredientCanonicalUnit})`" required>
        <UInput v-model.number="state.packSize" type="number" min="1" class="w-full" />
      </UFormField>
    </div>

    <UFormField label="Codes-barres" required help="Un par ligne ou séparés par virgules. EAN-8, EAN-13 ou UPC-A.">
      <UTextarea v-model="state.barcodesText" :rows="3" placeholder="3038359002564" class="w-full font-mono" />
    </UFormField>

    <UFormField label="Image (URL)">
      <UInput v-model="state.imageUrl" type="url" placeholder="https://…" class="w-full" />
    </UFormField>

    <div class="flex justify-end gap-2 pt-2">
      <UButton variant="ghost" color="neutral" @click="emit('cancel')">Annuler</UButton>
      <UButton type="submit" :loading="loading">{{ initial ? 'Enregistrer' : 'Ajouter' }}</UButton>
    </div>
  </UForm>
</template>
