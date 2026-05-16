<script setup lang="ts">
import type { CanonicalUnit, Dimension } from '../../shared/units/conversions'
import type { CreateRecipeDto, RecipeView } from '../../shared/dto/recipes'

const props = defineProps<{
  initial?: RecipeView | null
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: CreateRecipeDto]
  cancel: []
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
}

const state = reactive<{
  title: string
  instructions: string
  servings: number
  ingredients: RowState[]
}>({
  title: props.initial?.title ?? '',
  instructions: props.initial?.instructions ?? '',
  servings: props.initial?.servings ?? 2,
  ingredients: props.initial?.ingredients?.length
    ? props.initial.ingredients.map((i) => ({ ingredientId: i.ingredientId, quantity: { ...i.quantity } }))
    : [{ ingredientId: null, quantity: { value: 0, unit: 'g' } }],
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

    <div class="flex justify-end gap-2 pt-2">
      <UButton variant="ghost" color="neutral" @click="emit('cancel')">Annuler</UButton>
      <UButton type="submit" :loading="loading">{{ initial ? 'Enregistrer' : 'Créer la recette' }}</UButton>
    </div>
  </UForm>
</template>
