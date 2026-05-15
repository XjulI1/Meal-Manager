<script setup lang="ts">
import type { CreateRecipeDto, RecipeView } from '../../shared/dto/recipes'

const props = defineProps<{
  initial?: RecipeView | null
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: CreateRecipeDto]
  cancel: []
}>()

const state = reactive<CreateRecipeDto>({
  title: props.initial?.title ?? '',
  instructions: props.initial?.instructions ?? '',
  servings: props.initial?.servings ?? 2,
  ingredients: props.initial?.ingredients?.length
    ? props.initial.ingredients.map((i) => ({ name: i.name, quantity: { ...i.quantity } }))
    : [{ name: '', quantity: { value: 0, unit: 'g' } }],
})

function addIngredient() {
  state.ingredients.push({ name: '', quantity: { value: 0, unit: 'g' } })
}

function removeIngredient(idx: number) {
  if (state.ingredients.length === 1) return
  state.ingredients.splice(idx, 1)
}

function onSubmit() {
  if (!state.title.trim() || !state.instructions.trim()) return
  emit('submit', {
    title: state.title.trim(),
    instructions: state.instructions,
    servings: Number(state.servings),
    ingredients: state.ingredients
      .filter((i) => i.name.trim().length > 0)
      .map((i) => ({ name: i.name.trim(), quantity: i.quantity })),
  })
}
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
          <UInput v-model="ing.name" placeholder="Nom" class="flex-1" />
          <div class="w-64">
            <QuantityInput v-model="ing.quantity" />
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

    <div class="flex justify-end gap-2 pt-2">
      <UButton variant="ghost" color="neutral" @click="emit('cancel')">Annuler</UButton>
      <UButton type="submit" :loading="loading">{{ initial ? 'Enregistrer' : 'Créer la recette' }}</UButton>
    </div>
  </UForm>
</template>
