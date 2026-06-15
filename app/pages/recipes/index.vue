<script setup lang="ts">
import type { RecipeDraftSourceDto } from '../../../shared/dto/recipe-drafts'

definePageMeta({ title: 'Recettes' })

const api = useApiRecipes()
const draftApi = useApiRecipeDrafts()
const { aiEnabled } = useApiRecipeChat()
const toast = useToast()
const search = ref('')

const debounced = refDebounced(search, 250)
const { data: recipes, pending } = api.list(debounced)
const { data: drafts, refresh: refreshDrafts } = draftApi.list()

const DRAFT_SOURCE_LABELS: Record<RecipeDraftSourceDto, string> = {
  'manual': 'Saisie manuelle',
  'ai-chat': 'Assistant IA',
  'ai-url': 'Import URL',
  'ai-photo': 'Import photo',
  'mcp': 'Agent (MCP)',
}

async function deleteDraft(id: string) {
  if (!confirm('Supprimer ce brouillon ?')) return
  try {
    await draftApi.remove(id)
    await refreshDrafts()
    toast.add({ title: 'Brouillon supprimé', color: 'success' })
  }
  catch {
    toast.add({ title: 'Suppression impossible', color: 'error' })
  }
}

function refDebounced<T>(source: Ref<T>, ms: number): Ref<T> {
  const result = ref(source.value) as Ref<T>
  let timer: ReturnType<typeof setTimeout> | null = null
  watch(source, (value) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      result.value = value
    }, ms)
  })
  return result
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <h1 class="text-2xl font-semibold">Recettes</h1>
      <div class="flex items-center gap-2">
        <UButton v-if="aiEnabled" to="/recipes/chat" icon="i-lucide-sparkles" color="neutral" variant="soft">Assistant IA</UButton>
        <span
          v-else
          class="flex items-center gap-1.5 text-sm text-gray-500"
          title="L'accès aux outils IA n'est pas activé pour ce compte."
        >
          <UIcon name="i-lucide-lock" class="size-4" />
          Ce compte n'a pas accès aux outils IA
        </span>
        <UButton to="/recipes/new" icon="i-lucide-plus">Nouvelle recette</UButton>
      </div>
    </div>

    <UInput
      v-model="search"
      placeholder="Rechercher une recette…"
      icon="i-lucide-search"
      class="w-full max-w-md"
    />

    <UCard v-if="drafts?.length">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-file-pen-line" class="size-4 text-gray-400" />
          <h2 class="font-medium">Brouillons</h2>
          <span class="text-sm text-gray-500">({{ drafts.length }})</span>
        </div>
      </template>
      <ul class="divide-y divide-gray-200 dark:divide-gray-800">
        <li v-for="draft in drafts" :key="draft.id" class="flex items-center gap-3 py-2 px-2">
          <NuxtLink :to="`/recipes/new?draft=${draft.id}`" class="flex-1 min-w-0 flex items-center gap-3 hover:opacity-80">
            <UIcon name="i-lucide-pencil-line" class="size-5 text-amber-500" />
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">{{ draft.title || 'Brouillon sans titre' }}</p>
              <p class="text-xs text-gray-500">{{ DRAFT_SOURCE_LABELS[draft.source] }}</p>
            </div>
          </NuxtLink>
          <UButton
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            size="xs"
            aria-label="Supprimer le brouillon"
            @click="deleteDraft(draft.id)"
          />
        </li>
      </ul>
    </UCard>

    <UCard>
      <div v-if="pending && !recipes?.length" class="p-8 text-center text-gray-500">Chargement…</div>
      <div v-else-if="!recipes?.length" class="p-8 text-center text-gray-500">
        Aucune recette. Créez-en une pour démarrer.
      </div>
      <ul v-else class="divide-y divide-gray-200 dark:divide-gray-800">
        <li v-for="recipe in recipes" :key="recipe.id">
          <NuxtLink
            :to="`/recipes/${recipe.id}`"
            class="py-3 px-2 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-md"
          >
            <UIcon name="i-lucide-utensils" class="size-5 text-gray-400" />
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">{{ recipe.title }}</p>
              <p class="text-sm text-gray-500">{{ recipe.servings }} portion(s)</p>
            </div>
            <UIcon name="i-lucide-chevron-right" class="size-4 text-gray-400" />
          </NuxtLink>
        </li>
      </ul>
    </UCard>
  </div>
</template>
