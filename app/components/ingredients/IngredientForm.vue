<script setup lang="ts">
import type { Allergen, CanonicalUnitDto, CreateIngredientDto, IngredientCategory, IngredientStorage, IngredientView } from '../../../shared/dto/ingredient'
import { CATEGORY_LABELS, CATEGORY_ORDER, STORAGE_LABELS } from '../../composables/useApiIngredients'

const props = defineProps<{
  initial?: IngredientView | null
  loading?: boolean
  /** When true, hide the optional fields panel for a compact "quick create" flow. */
  compact?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: CreateIngredientDto]
  cancel: []
}>()

const state = reactive<{
  name: string
  storage: IngredientStorage
  category: IngredientCategory
  canonicalUnit: CanonicalUnitDto
  shelfLifeDays: number | null
  defaultPackSize: number | null
  imageUrl: string | null
  allergens: Allergen[]
  aliasesText: string
}>({
  name: props.initial?.name ?? '',
  storage: props.initial?.storage ?? 'pantry',
  category: props.initial?.category ?? 'grocery',
  canonicalUnit: props.initial?.canonicalUnit ?? 'g',
  shelfLifeDays: props.initial?.shelfLifeDays ?? null,
  defaultPackSize: props.initial?.defaultPackSize ?? null,
  imageUrl: props.initial?.imageUrl ?? null,
  allergens: (props.initial?.allergens ?? []) as Allergen[],
  aliasesText: (props.initial?.aliases ?? []).join(', '),
})

const storageOptions = (Object.keys(STORAGE_LABELS) as IngredientStorage[]).map((value) => ({
  label: STORAGE_LABELS[value],
  value,
}))
const categoryOptions = CATEGORY_ORDER.map((value) => ({
  label: CATEGORY_LABELS[value],
  value,
}))
const unitOptions = [
  { label: 'g (masse)', value: 'g' as const },
  { label: 'ml (volume)', value: 'ml' as const },
  { label: 'unité (pièce)', value: 'unit' as const },
]
const allergenOptions: Array<{ label: string, value: Allergen }> = [
  { label: 'Gluten', value: 'gluten' },
  { label: 'Crustacés', value: 'crustaceans' },
  { label: 'Œufs', value: 'eggs' },
  { label: 'Poisson', value: 'fish' },
  { label: 'Arachides', value: 'peanuts' },
  { label: 'Soja', value: 'soy' },
  { label: 'Lait', value: 'milk' },
  { label: 'Fruits à coque', value: 'nuts' },
  { label: 'Céleri', value: 'celery' },
  { label: 'Moutarde', value: 'mustard' },
  { label: 'Sésame', value: 'sesame' },
  { label: 'Sulfites', value: 'sulphites' },
  { label: 'Lupin', value: 'lupin' },
  { label: 'Mollusques', value: 'molluscs' },
]

function onSubmit() {
  const name = state.name.trim()
  if (!name) return
  const aliases = state.aliasesText
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)

  emit('submit', {
    name,
    storage: state.storage,
    category: state.category,
    canonicalUnit: state.canonicalUnit,
    shelfLifeDays: state.shelfLifeDays ?? undefined,
    defaultPackSize: state.defaultPackSize ?? undefined,
    imageUrl: state.imageUrl ?? undefined,
    allergens: state.allergens,
    aliases,
  })
}
</script>

<template>
  <UForm :state="state" class="space-y-4" @submit.prevent="onSubmit">
    <UFormField label="Nom" required>
      <UInput v-model="state.name" placeholder="Tomate cerise, lait demi-écrémé…" class="w-full" />
    </UFormField>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <UFormField label="Stockage" required>
        <USelect v-model="state.storage" :items="storageOptions" class="w-full" />
      </UFormField>
      <UFormField label="Rayon" required>
        <USelect v-model="state.category" :items="categoryOptions" class="w-full" />
      </UFormField>
      <UFormField label="Unité de mesure" required>
        <USelect v-model="state.canonicalUnit" :items="unitOptions" class="w-full" />
      </UFormField>
    </div>

    <template v-if="!compact">
      <UFormField label="Alias (séparés par des virgules)">
        <UInput v-model="state.aliasesText" placeholder="tomates cerises, cherry" class="w-full" />
      </UFormField>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <UFormField label="Durée de conservation (jours)" help="Indicatif pour les produits frais.">
          <UInput v-model.number="state.shelfLifeDays" type="number" min="1" class="w-full" />
        </UFormField>
        <UFormField label="Conditionnement par défaut" help="Quantité du pack courant (en unité canonique).">
          <UInput v-model.number="state.defaultPackSize" type="number" min="1" class="w-full" />
        </UFormField>
      </div>

      <UFormField label="Allergènes">
        <USelectMenu v-model="state.allergens" :items="allergenOptions" multiple class="w-full" />
      </UFormField>

      <UFormField label="Image (URL)">
        <UInput v-model="state.imageUrl" type="url" placeholder="https://…" class="w-full" />
      </UFormField>
    </template>

    <div class="flex justify-end gap-2 pt-2">
      <UButton variant="ghost" color="neutral" @click="emit('cancel')">Annuler</UButton>
      <UButton type="submit" :loading="loading">{{ initial ? 'Enregistrer' : 'Créer' }}</UButton>
    </div>
  </UForm>
</template>
