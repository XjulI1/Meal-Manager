<script setup lang="ts">
definePageMeta({ title: 'Recettes' })

const api = useApiRecipes()
const search = ref('')

const debounced = refDebounced(search, 250)
const { data: recipes, pending } = api.list(debounced)

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
      <UButton to="/recipes/new" icon="i-lucide-plus">Nouvelle recette</UButton>
    </div>

    <UInput
      v-model="search"
      placeholder="Rechercher une recette…"
      icon="i-lucide-search"
      class="w-full max-w-md"
    />

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
