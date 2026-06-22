<script setup lang="ts">
import type { CreateRecipeDto } from '../../../shared/dto/recipes'
import type { RecipeDraftSourceDto, RecipeDraftView } from '../../../shared/dto/recipe-drafts'
import type { RecipePrefill } from '../../composables/useApiRecipeChat'
import type { RecipeDraftContent } from '../../composables/useRecipeDraftSync'

definePageMeta({ title: 'Nouvelle recette' })

const toast = useToast()
const route = useRoute()
const api = useApiRecipes()
const draftApi = useApiRecipeDrafts()
const ingredientsApi = useApiIngredients()
const submitting = ref(false)

// Resume an existing draft when arrived via `?draft=<id>`.
const resumeId = typeof route.query.draft === 'string' ? route.query.draft : null

// Consume the one-shot AI assistant hand-off (if the user arrived from the chat).
const prefillState = useRecipePrefill()
const aiPrefill = prefillState.value
prefillState.value = null

const prefill = ref<RecipePrefill | null>(aiPrefill)
// A resumed draft already exists server-side (no create); a fresh form records its origin.
const source: RecipeDraftSourceDto = aiPrefill?.source ?? 'manual'
const sync = useRecipeDraftSync(source, resumeId)

// The form reads `prefill` once at setup, so on resume we wait for the draft to load.
const ready = ref(!resumeId)

/** Map a saved draft's free-text content into a form pre-fill, matching the catalog by name. */
function draftToPrefill(
  draft: RecipeDraftView,
  ingredients: { id: string, name: string, canonicalUnit: string }[],
): RecipePrefill {
  const byName = new Map(ingredients.map((i) => [i.name.trim().toLowerCase(), i]))
  return {
    title: draft.title ?? '',
    instructions: draft.instructions ?? '',
    servings: draft.servings ?? 2,
    sourceUrl: draft.sourceUrl ?? undefined,
    rows: draft.ingredients.map((ing) => {
      const match = byName.get(ing.name.trim().toLowerCase())
      if (match) {
        return {
          ingredientId: match.id,
          name: ing.name,
          quantity: { value: ing.quantity?.value ?? 0, unit: match.canonicalUnit },
        }
      }
      return {
        ingredientId: null,
        name: ing.name,
        quantity: { value: ing.quantity?.value ?? 0, unit: ing.quantity?.unit ?? 'g' },
        hint: `À préciser : « ${ing.name} »`,
      }
    }),
  }
}

onMounted(async () => {
  if (!resumeId) return
  try {
    const [draft, ingredients] = await Promise.all([
      draftApi.fetchOne(resumeId),
      ingredientsApi.listOnce(),
    ])
    prefill.value = draftToPrefill(draft, ingredients)
  }
  catch {
    toast.add({ title: 'Brouillon introuvable', color: 'error' })
  }
  finally {
    ready.value = true
  }
})

function onChange(content: RecipeDraftContent) {
  sync.schedule(content)
}

async function onSubmit(payload: CreateRecipeDto) {
  submitting.value = true
  try {
    const recipe = await api.create(payload)
    await sync.promote() // the draft became a recipe — drop it
    toast.add({ title: 'Recette créée', color: 'success' })
    await navigateTo(`/recipes/${recipe.id}`)
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

async function onDiscard() {
  try {
    await sync.discard()
    toast.add({ title: 'Brouillon supprimé', color: 'success' })
  }
  catch {
    toast.add({ title: 'Suppression impossible', color: 'error' })
  }
  await navigateTo('/recipes')
}
</script>

<template>
  <div class="space-y-4 max-w-3xl">
    <div class="flex items-center gap-3">
      <UButton to="/recipes" icon="i-lucide-arrow-left" color="neutral" variant="ghost" />
      <h1 class="text-2xl font-semibold">Nouvelle recette</h1>
    </div>
    <UCard>
      <RecipeForm
        v-if="ready"
        :key="resumeId ?? 'new'"
        :prefill="prefill"
        :loading="submitting"
        draft-autosave
        :draft-saving="sync.saving.value"
        @submit="onSubmit"
        @change="onChange"
        @discard="onDiscard"
      />
      <div v-else class="p-8 text-center text-gray-500">Chargement du brouillon…</div>
    </UCard>
  </div>
</template>
