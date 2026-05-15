<script setup lang="ts">
import type { CreateRecipeDto } from '../../../shared/dto/recipes'

definePageMeta({ title: 'Nouvelle recette' })

const toast = useToast()
const api = useApiRecipes()
const submitting = ref(false)

async function onSubmit(payload: CreateRecipeDto) {
  submitting.value = true
  try {
    const recipe = await api.create(payload)
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
</script>

<template>
  <div class="space-y-4 max-w-3xl">
    <div class="flex items-center gap-3">
      <UButton to="/recipes" icon="i-lucide-arrow-left" color="neutral" variant="ghost" />
      <h1 class="text-2xl font-semibold">Nouvelle recette</h1>
    </div>
    <UCard>
      <RecipeForm :loading="submitting" @submit="onSubmit" @cancel="navigateTo('/recipes')" />
    </UCard>
  </div>
</template>
