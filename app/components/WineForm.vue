<script setup lang="ts">
import type { CreateWineDto, WineColor, WineRegion, WineView } from '../../shared/dto/wine-cellar'

const props = defineProps<{
  initial?: WineView | null
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: CreateWineDto]
  cancel: []
}>()

const name = ref(props.initial?.name ?? '')
const color = ref<WineColor>(props.initial?.color ?? 'rouge')
const region = ref<WineRegion | ''>(props.initial?.region ?? '')
const domain = ref(props.initial?.domain ?? '')
const appellation = ref(props.initial?.appellation ?? '')
const country = ref(props.initial?.country ?? 'France')
const vintage = ref<number | null>(props.initial?.vintage ?? null)
const gardeMin = ref<number | null>(props.initial?.gardeMin ?? null)
const gardeMax = ref<number | null>(props.initial?.gardeMax ?? null)
const rating = ref<number | null>(props.initial?.rating ?? null)
const comment = ref(props.initial?.comment ?? '')

const regionOptions = [{ value: '', label: '—' }, ...WINE_REGION_OPTIONS]
const ratingOptions = [
  { value: -1, label: 'Non noté' },
  ...[0, 1, 2, 3, 4, 5].map((n) => ({ value: n, label: `${n}/5` })),
]

function trimmed(v: string): string | undefined {
  const t = v.trim()
  return t.length > 0 ? t : undefined
}

function onSubmit() {
  if (!name.value.trim()) return
  emit('submit', {
    name: name.value.trim(),
    color: color.value,
    region: region.value === '' ? undefined : region.value,
    domain: trimmed(domain.value),
    appellation: trimmed(appellation.value),
    country: trimmed(country.value),
    vintage: vintage.value ?? undefined,
    gardeMin: gardeMin.value ?? undefined,
    gardeMax: gardeMax.value ?? undefined,
    rating: rating.value === null || rating.value < 0 ? undefined : rating.value,
    comment: trimmed(comment.value),
  })
}
</script>

<template>
  <UForm :state="{ name }" class="space-y-4" @submit.prevent="onSubmit">
    <UFormField label="Nom du vin" required>
      <UInput v-model="name" class="w-full" placeholder="Saint-Amour" />
    </UFormField>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UFormField label="Robe" required>
        <USelect v-model="color" :items="WINE_COLOR_OPTIONS" class="w-full" />
      </UFormField>
      <UFormField label="Région">
        <USelect v-model="region" :items="regionOptions" class="w-full" />
      </UFormField>
      <UFormField label="Domaine">
        <UInput v-model="domain" class="w-full" placeholder="Cave de Chaintré" />
      </UFormField>
      <UFormField label="Appellation">
        <UInput v-model="appellation" class="w-full" />
      </UFormField>
      <UFormField label="Pays">
        <UInput v-model="country" class="w-full" />
      </UFormField>
      <UFormField label="Millésime">
        <UInput v-model.number="vintage" type="number" class="w-full" placeholder="2023" />
      </UFormField>
      <UFormField label="Garde min (année)">
        <UInput v-model.number="gardeMin" type="number" class="w-full" />
      </UFormField>
      <UFormField label="Garde max (année)">
        <UInput v-model.number="gardeMax" type="number" class="w-full" />
      </UFormField>
      <UFormField label="Note">
        <USelect v-model="rating" :items="ratingOptions" class="w-full" />
      </UFormField>
    </div>

    <UFormField label="Commentaire">
      <UTextarea v-model="comment" class="w-full" :rows="2" />
    </UFormField>

    <div class="flex justify-end gap-2 pt-2">
      <UButton variant="ghost" color="neutral" @click="emit('cancel')">Annuler</UButton>
      <UButton type="submit" :loading="loading" :disabled="!name.trim()">
        {{ initial ? 'Enregistrer' : 'Créer' }}
      </UButton>
    </div>
  </UForm>
</template>
