<script setup lang="ts">
import type { Dimension } from '../../shared/units/conversions'
import type { MenuSlotItemView, MenuSlotView } from '../../shared/dto/menus'

const props = defineProps<{
  open: boolean
  /** Current state of the (day, meal) slot being edited, or null when empty. */
  slotView: MenuSlotView | null
  recipeById: Map<string, { id: string, title: string }>
  ingredientById: Map<string, { id: string, name: string, canonicalUnit: string }>
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  'add-recipe': [payload: { recipeId: string, servings: number }]
  'add-ingredient': [payload: { ingredientId: string, quantity: { value: number, unit: string } }]
  'remove-item': [itemId: string]
}>()

const CANONICAL_TO_DIMENSION: Record<string, Dimension> = {
  g: 'mass',
  ml: 'volume',
  unit: 'discrete',
}

const recipesApi = useApiRecipes()
const { data: recipes } = recipesApi.list()

const recipeItem = computed<MenuSlotItemView | null>(() => props.slotView?.items.find((i) => i.kind === 'recipe') ?? null)
const ingredientItems = computed(() => props.slotView?.items.filter((i) => i.kind === 'ingredient') ?? [])

const editingRecipe = ref(false)
const recipeSelection = ref<string | null>(null)
const recipeServings = ref(2)

watch(() => props.open, (open) => {
  if (!open) return
  editingRecipe.value = false
  recipeSelection.value = null
  recipeServings.value = 2
  newIngredientId.value = null
  newIngredientQuantity.value = { value: 0, unit: 'g' }
})

function startAssignRecipe() {
  recipeSelection.value = recipeItem.value?.kind === 'recipe' ? recipeItem.value.recipeId : null
  recipeServings.value = recipeItem.value?.kind === 'recipe' ? recipeItem.value.servings : 2
  editingRecipe.value = true
}

function confirmRecipe() {
  if (!recipeSelection.value) return
  emit('add-recipe', { recipeId: recipeSelection.value, servings: Number(recipeServings.value) || 1 })
  editingRecipe.value = false
}

const newIngredientId = ref<string | null>(null)
const newIngredientQuantity = ref<{ value: number, unit: string }>({ value: 0, unit: 'g' })

const newIngredientDimension = computed<Dimension | undefined>(() => {
  if (!newIngredientId.value) return undefined
  const ing = props.ingredientById.get(newIngredientId.value)
  return ing ? CANONICAL_TO_DIMENSION[ing.canonicalUnit] : undefined
})

function confirmAddIngredient() {
  if (!newIngredientId.value || !(Number(newIngredientQuantity.value.value) > 0)) return
  emit('add-ingredient', { ingredientId: newIngredientId.value, quantity: { ...newIngredientQuantity.value, value: Number(newIngredientQuantity.value.value) } })
  newIngredientId.value = null
  newIngredientQuantity.value = { value: 0, unit: 'g' }
}
</script>

<template>
  <UModal
    :open="open"
    title="Composer le repas"
    description="Associez une recette et/ou des ingrédients libres à ce créneau du menu."
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="space-y-5">
        <div>
          <p class="text-sm font-medium mb-2">Recette</p>
          <div v-if="recipeItem?.kind === 'recipe' && !editingRecipe" class="flex items-center justify-between gap-2 rounded-md border border-gray-200 dark:border-gray-800 p-2">
            <div>
              <p class="text-sm font-medium">{{ recipeById.get(recipeItem.recipeId)?.title ?? 'Recette' }}</p>
              <p class="text-xs text-gray-500">{{ recipeItem.servings }} portion(s)</p>
            </div>
            <div class="flex items-center gap-1">
              <UButton icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" @click="startAssignRecipe" />
              <UButton icon="i-lucide-x" size="xs" color="error" variant="ghost" @click="emit('remove-item', recipeItem.id)" />
            </div>
          </div>
          <div v-else-if="!editingRecipe">
            <UButton icon="i-lucide-plus" size="sm" variant="soft" @click="startAssignRecipe">Ajouter une recette</UButton>
          </div>
          <div v-if="editingRecipe" class="space-y-2 rounded-md border border-dashed border-gray-300 dark:border-gray-700 p-2">
            <USelectMenu
              v-model="recipeSelection"
              :items="(recipes ?? []).map((r) => ({ label: r.title, value: r.id }))"
              value-key="value"
              label-key="label"
              searchable
              placeholder="Choisir une recette…"
            />
            <UFormField label="Portions">
              <UInput v-model.number="recipeServings" type="number" min="1" max="50" class="w-full" />
            </UFormField>
            <div class="flex justify-end gap-2">
              <UButton size="xs" variant="ghost" color="neutral" @click="editingRecipe = false">Annuler</UButton>
              <UButton size="xs" :disabled="!recipeSelection" @click="confirmRecipe">Valider</UButton>
            </div>
          </div>
        </div>

        <div>
          <p class="text-sm font-medium mb-2">Ingrédients libres</p>
          <div class="space-y-2 mb-2">
            <div
              v-for="item in ingredientItems"
              :key="item.id"
              class="flex items-center justify-between gap-2 rounded-md border border-gray-200 dark:border-gray-800 p-2"
            >
              <p class="text-sm">
                {{ item.kind === 'ingredient' ? (ingredientById.get(item.ingredientId)?.name ?? 'Ingrédient') : '' }}
                <span class="text-xs text-gray-500">
                  — {{ item.kind === 'ingredient' ? `${item.quantity.value} ${item.quantity.unit}` : '' }}
                </span>
              </p>
              <UButton icon="i-lucide-x" size="xs" color="error" variant="ghost" @click="emit('remove-item', item.id)" />
            </div>
            <p v-if="ingredientItems.length === 0" class="text-xs text-gray-500">Aucun ingrédient libre.</p>
          </div>
          <div class="flex gap-2 items-start">
            <div class="flex-1">
              <IngredientsIngredientPicker v-model="newIngredientId" />
            </div>
            <div class="w-40">
              <QuantityInput v-model="newIngredientQuantity" :dimension="newIngredientDimension" />
            </div>
            <UButton icon="i-lucide-plus" :disabled="!newIngredientId" @click="confirmAddIngredient" />
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end">
        <UButton variant="ghost" color="neutral" @click="emit('update:open', false)">Fermer</UButton>
      </div>
    </template>
  </UModal>
</template>
