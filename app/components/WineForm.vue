<script setup lang="ts">
import type { CreateWineDto, WineColor, WineLabelInputDto, WineRegion, WineView } from '../../shared/dto/wine-cellar'
import type { WineLabelDraftDto } from '../../shared/dto/wine-label'

const props = defineProps<{
  initial?: WineView | null
  /** Seed values from a label scan (creation only; distinct from `initial`). */
  prefill?: WineLabelDraftDto | null
  /** Label photo from a scan; pre-loads the form's photo (user may replace it). */
  labelPhoto?: WineLabelInputDto | null
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: CreateWineDto]
  cancel: []
}>()

// Photo to persist: seeded from a scan, or picked/replaced manually here.
const labelPhoto = ref<WineLabelInputDto | null>(props.labelPhoto ?? null)
const photoConverting = ref(false)
const photoInput = useTemplateRef<HTMLInputElement>('photoInput')

/** Preview: freshly picked/scanned photo wins, else the wine's stored photo. */
const photoPreview = computed(() =>
  labelPhoto.value
    ? `data:${labelPhoto.value.mediaType};base64,${labelPhoto.value.data}`
    : (props.initial?.photoUrl ?? null),
)

async function onPhotoPicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  photoConverting.value = true
  try {
    labelPhoto.value = await normalizeImageFile(file)
  }
  catch {
    labelPhoto.value = null
  }
  finally {
    photoConverting.value = false
  }
}

const seed = props.initial ?? props.prefill ?? null

const name = ref(seed?.name ?? '')
const color = ref<WineColor>(seed?.color ?? 'rouge')
const region = ref<WineRegion | '__none__'>(seed?.region ?? '__none__')
const domain = ref(seed?.domain ?? '')
const appellation = ref(seed?.appellation ?? '')
const country = ref(seed?.country ?? 'France')
const vintage = ref<number | null>(seed?.vintage ?? null)
const gardeMin = ref<number | null>(seed?.gardeMin ?? null)
const gardeMax = ref<number | null>(seed?.gardeMax ?? null)
const rating = ref<number | null>(props.initial?.rating ?? null)
const comment = ref(props.initial?.comment ?? '')

const regionOptions = [{ value: '__none__', label: '—' }, ...WINE_REGION_OPTIONS]
const ratingOptions = [
  { value: -1, label: 'Non noté' },
  ...[0, 1, 2, 3, 4, 5].map((n) => ({ value: n, label: `${n}/5` })),
]

/** Empty text → null (explicitly clears the field on update). */
function trimmedOrNull(v: string): string | null {
  const t = v.trim()
  return t.length > 0 ? t : null
}

/**
 * Empty number inputs surface as '' / NaN with `v-model.number`; normalize any
 * non-finite value to null so we clear the field rather than send an invalid one.
 */
function numberOrNull(v: number | null): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function onSubmit() {
  if (!name.value.trim()) return
  emit('submit', {
    name: name.value.trim(),
    color: color.value,
    region: region.value === '__none__' ? null : region.value,
    domain: trimmedOrNull(domain.value),
    appellation: trimmedOrNull(appellation.value),
    country: trimmedOrNull(country.value),
    vintage: numberOrNull(vintage.value),
    gardeMin: numberOrNull(gardeMin.value),
    gardeMax: numberOrNull(gardeMax.value),
    rating: rating.value === null || rating.value < 0 ? null : rating.value,
    comment: trimmedOrNull(comment.value),
    labelPhoto: labelPhoto.value ?? undefined,
  })
}
</script>

<template>
  <UForm :state="{ name }" class="space-y-4" @submit.prevent="onSubmit">
    <div class="flex flex-col items-center gap-2">
      <img
        v-if="photoPreview"
        :src="photoPreview"
        alt="Étiquette du vin"
        class="max-h-40 w-auto rounded-lg object-contain"
      >
      <input ref="photoInput" type="file" accept="image/*" capture="environment" class="hidden" @change="onPhotoPicked">
      <UButton
        icon="i-lucide-image-plus"
        color="neutral"
        variant="soft"
        size="xs"
        :loading="photoConverting"
        @click="photoInput?.click()"
      >
        {{ photoPreview ? 'Changer la photo' : 'Ajouter une photo' }}
      </UButton>
    </div>

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
