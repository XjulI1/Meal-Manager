<script setup lang="ts">
import type { CreateRecipeDto } from '../../../shared/dto/recipes'

definePageMeta({ title: 'Recette' })

const route = useRoute()
const toast = useToast()
const api = useApiRecipes()
const recipeId = computed(() => String(route.params.id))

const { data: recipe, pending, refresh } = api.getById(recipeId)

const editing = ref(false)
const submitting = ref(false)

async function onSubmit(payload: CreateRecipeDto) {
  submitting.value = true
  try {
    await api.update(recipeId.value, payload)
    toast.add({ title: 'Recette enregistrée', color: 'success' })
    editing.value = false
    await refresh()
  }
  catch (error) {
    toast.add({
      title: (error as { statusMessage?: string }).statusMessage ?? 'Enregistrement impossible',
      color: 'error',
    })
  }
  finally {
    submitting.value = false
  }
}

async function onDelete() {
  if (!recipe.value) return
  if (!confirm(`Supprimer « ${recipe.value.title} » ?`)) return
  try {
    await api.remove(recipeId.value)
    toast.add({ title: 'Recette supprimée', color: 'success' })
    await navigateTo('/recipes')
  }
  catch (error) {
    toast.add({
      title: (error as { statusMessage?: string }).statusMessage ?? 'Suppression impossible',
      color: 'error',
    })
  }
}
</script>

<template>
  <div class="space-y-4 max-w-3xl">
    <div class="flex items-center gap-3">
      <UButton to="/recipes" icon="i-lucide-arrow-left" color="neutral" variant="ghost" />
      <h1 class="text-2xl font-semibold flex-1 truncate">
        {{ recipe?.title ?? 'Recette' }}
      </h1>
      <template v-if="recipe && !editing">
        <UButton icon="i-lucide-pencil" variant="soft" @click="editing = true">Modifier</UButton>
        <UButton icon="i-lucide-trash-2" color="error" variant="soft" @click="onDelete">Supprimer</UButton>
      </template>
    </div>

    <UCard v-if="pending && !recipe">
      <div class="p-8 text-center text-gray-500">Chargement…</div>
    </UCard>

    <UCard v-else-if="editing && recipe">
      <RecipeForm
        :initial="recipe"
        :loading="submitting"
        @submit="onSubmit"
        @cancel="editing = false"
      />
    </UCard>

    <UCard v-else-if="recipe">
      <div class="space-y-6">
        <div>
          <p class="text-sm text-gray-500">Portions</p>
          <p class="font-medium">{{ recipe.servings }}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500 mb-2">Ingrédients</p>
          <ul class="space-y-1">
            <li v-for="(ing, idx) in recipe.ingredients" :key="idx" class="flex items-center gap-2">
              <UIcon name="i-lucide-dot" class="size-5 text-gray-400" />
              <span class="font-medium">{{ ing.name }}</span>
              <span class="text-gray-500">— {{ ing.quantity.value }} {{ ing.quantity.unit }}</span>
            </li>
          </ul>
        </div>
        <div>
          <p class="text-sm text-gray-500 mb-2">Instructions</p>
          <p class="whitespace-pre-line">{{ recipe.instructions }}</p>
        </div>
      </div>
    </UCard>
  </div>
</template>
