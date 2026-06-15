<script setup lang="ts">
import type { CanonicalUnit, Dimension } from '../../shared/units/conversions'
import type { CreateRecipeDto, RecipeView } from '../../shared/dto/recipes'
import type { RecipePrefill } from '../composables/useApiRecipeChat'
import type { RecipeDraftContent } from '../composables/useRecipeDraftSync'

const props = defineProps<{
  initial?: RecipeView | null
  /** AI-assistant pre-fill (takes precedence over `initial` when present). */
  prefill?: RecipePrefill | null
  loading?: boolean
  /** When true, every change is emitted via `change` so the parent can autosave a draft. */
  draftAutosave?: boolean
  /** Whether a draft autosave is currently in flight (UI hint). */
  draftSaving?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: CreateRecipeDto]
  cancel: []
  /** Emitted on every edit when `draftAutosave` is on — loose, free-text content. */
  change: [content: RecipeDraftContent]
  /** Explicit "ne pas garder" — the parent deletes the draft. */
  discard: []
}>()

const CANONICAL_TO_DIMENSION: Record<CanonicalUnit, Dimension> = {
  g: 'mass',
  ml: 'volume',
  unit: 'discrete',
}

const api = useApiIngredients()
const { data: ingredients } = api.list()

interface RowState {
  ingredientId: string | null
  quantity: { value: number, unit: string }
  /** Free-text ingredient name, preserved for the saved draft (esp. proposed-new ones). */
  name?: string
  /** Set for AI-proposed ingredients the user must pick/create before saving. */
  hint?: string
}

function initialRows(): RowState[] {
  if (props.prefill?.rows.length) {
    return props.prefill.rows.map((r) => ({
      ingredientId: r.ingredientId,
      quantity: { ...r.quantity },
      name: r.name,
      hint: r.hint,
    }))
  }
  if (props.initial?.ingredients?.length) {
    return props.initial.ingredients.map((i) => ({
      ingredientId: i.ingredientId,
      quantity: { ...i.quantity },
    }))
  }
  return [{ ingredientId: null, quantity: { value: 0, unit: 'g' } }]
}

const state = reactive<{
  title: string
  instructions: string
  servings: number
  ingredients: RowState[]
}>({
  title: props.prefill?.title ?? props.initial?.title ?? '',
  instructions: props.prefill?.instructions ?? props.initial?.instructions ?? '',
  servings: props.prefill?.servings ?? props.initial?.servings ?? 2,
  ingredients: initialRows(),
})

function ingredientById(id: string | null) {
  if (!id) return null
  return (ingredients.value ?? []).find((i) => i.id === id) ?? null
}

function dimensionOf(id: string | null): Dimension | undefined {
  const ing = ingredientById(id)
  return ing ? CANONICAL_TO_DIMENSION[ing.canonicalUnit] : undefined
}

function addIngredient() {
  state.ingredients.push({ ingredientId: null, quantity: { value: 0, unit: 'g' } })
}

function removeIngredient(idx: number) {
  if (state.ingredients.length === 1) return
  state.ingredients.splice(idx, 1)
}

function onSubmit() {
  if (!state.title.trim() || !state.instructions.trim()) return
  const filtered = state.ingredients.filter((i) => i.ingredientId !== null)
  if (filtered.length === 0) return

  emit('submit', {
    title: state.title.trim(),
    instructions: state.instructions,
    servings: Number(state.servings),
    ingredients: filtered.map((i) => ({
      ingredientId: i.ingredientId!,
      quantity: i.quantity,
    })),
  })
}

/** Loose snapshot of the form for autosave: free-text names, no catalog resolution. */
function buildDraftContent(): RecipeDraftContent {
  return {
    title: state.title.trim() || undefined,
    instructions: state.instructions.trim() ? state.instructions : undefined,
    servings: Number(state.servings) || undefined,
    ingredients: state.ingredients
      .map((r) => {
        const name = (ingredientById(r.ingredientId)?.name ?? r.name ?? '').trim()
        const value = Number(r.quantity?.value) || 0
        return {
          name,
          ...(value > 0 ? { quantity: { value, unit: r.quantity.unit } } : {}),
        }
      })
      .filter((i) => i.name.length > 0),
    ...(props.prefill?.sourceUrl ? { sourceUrl: props.prefill.sourceUrl } : {}),
  }
}

// Autosave: emit the current content on mount (persists an AI pre-fill, leaves a
// blank manual form untouched) then on every edit. Client-only — drafts hit the API.
onMounted(() => {
  if (!props.draftAutosave) return
  emit('change', buildDraftContent())
  watch(state, () => emit('change', buildDraftContent()), { deep: true })
})
</script>

<template>
  <UForm :state="state" class="space-y-4" @submit.prevent="onSubmit">
    <UFormField label="Titre" required>
      <UInput v-model="state.title" placeholder="Pâtes carbonara" class="w-full" />
    </UFormField>

    <UFormField label="Portions" required>
      <UInput v-model.number="state.servings" type="number" min="1" max="50" class="w-full" />
    </UFormField>

    <UFormField label="Instructions" required>
      <UTextarea v-model="state.instructions" :rows="6" class="w-full" placeholder="Étape 1 : …" />
    </UFormField>

    <div>
      <div class="flex items-center justify-between mb-2">
        <label class="text-sm font-medium">Ingrédients</label>
        <UButton size="xs" icon="i-lucide-plus" variant="soft" @click="addIngredient">Ajouter</UButton>
      </div>
      <div class="space-y-2">
        <div
          v-for="(ing, idx) in state.ingredients"
          :key="idx"
          class="flex gap-2 items-start"
        >
          <div class="flex-1">
            <IngredientsIngredientPicker v-model="ing.ingredientId" />
            <p v-if="ing.hint" class="mt-1 text-xs text-amber-600 dark:text-amber-400">
              {{ ing.hint }}
            </p>
          </div>
          <div class="w-64">
            <QuantityInput v-model="ing.quantity" :dimension="dimensionOf(ing.ingredientId)" />
          </div>
          <UButton
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            :disabled="state.ingredients.length === 1"
            @click="removeIngredient(idx)"
          />
        </div>
      </div>
    </div>

    <div class="flex items-center gap-2 pt-2">
      <p v-if="draftAutosave" class="text-xs text-gray-500 flex items-center gap-1.5">
        <template v-if="draftSaving">
          <UIcon name="i-lucide-loader-circle" class="size-3.5 animate-spin" />
          Enregistrement du brouillon…
        </template>
        <template v-else>
          <UIcon name="i-lucide-cloud-check" class="size-3.5 text-green-500" />
          Brouillon enregistré automatiquement
        </template>
      </p>
      <div class="flex-1" />
      <UButton
        v-if="draftAutosave"
        variant="ghost"
        color="error"
        icon="i-lucide-trash-2"
        @click="emit('discard')"
      >Ne pas garder</UButton>
      <UButton v-else variant="ghost" color="neutral" @click="emit('cancel')">Annuler</UButton>
      <UButton type="submit" :loading="loading">{{ initial ? 'Enregistrer' : 'Créer la recette' }}</UButton>
    </div>
  </UForm>
</template>
