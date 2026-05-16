<script setup lang="ts">
import type {
  CreateIngredientDto,
  IngredientCategory,
  IngredientStorage,
  IngredientView,
  ListIngredientsQueryDto,
} from '../../../shared/dto/ingredient'
import type { CreateProductDto } from '../../../shared/dto/product'
import { CATEGORY_LABELS, CATEGORY_ORDER, STORAGE_LABELS } from '../../composables/useApiIngredients'

definePageMeta({ title: 'Ingrédients' })

const toast = useToast()
const api = useApiIngredients()
const productsApi = useApiProducts()

const search = ref('')
const debouncedSearch = ref('')
let debounceHandle: ReturnType<typeof setTimeout> | null = null
watch(search, (value) => {
  if (debounceHandle) clearTimeout(debounceHandle)
  debounceHandle = setTimeout(() => {
    debouncedSearch.value = value.trim()
  }, 200)
})

const storageFilter = ref<IngredientStorage | undefined>(undefined)
const categoryFilter = ref<IngredientCategory | undefined>(undefined)
const includeArchived = ref(false)

const query = computed<ListIngredientsQueryDto>(() => ({
  q: debouncedSearch.value || undefined,
  storage: storageFilter.value,
  category: categoryFilter.value,
  includeArchived: includeArchived.value || undefined,
}))

const { data: items, refresh, pending } = api.list(query)

const showForm = ref(false)
const editing = ref<IngredientView | null>(null)
const submitting = ref(false)

const showProductForm = ref(false)
const productTarget = ref<IngredientView | null>(null)

function openCreate() {
  editing.value = null
  showForm.value = true
}

function openAddProduct(ing: IngredientView) {
  productTarget.value = ing
  showProductForm.value = true
}

async function onSubmit(payload: CreateIngredientDto) {
  submitting.value = true
  try {
    if (editing.value) {
      await api.update(editing.value.id, payload)
      toast.add({ title: 'Ingrédient mis à jour', color: 'success' })
    }
    else {
      await api.create(payload)
      toast.add({ title: 'Ingrédient créé', color: 'success' })
    }
    showForm.value = false
    await refresh()
  }
  catch (error) {
    toast.add({
      title: (error as { statusMessage?: string }).statusMessage ?? 'Action impossible',
      color: 'error',
    })
  }
  finally {
    submitting.value = false
  }
}

async function onProductSubmit(payload: CreateProductDto) {
  if (!productTarget.value) return
  submitting.value = true
  try {
    await productsApi.addToIngredient(productTarget.value.id, payload)
    toast.add({ title: 'Produit ajouté', color: 'success' })
    showProductForm.value = false
    productTarget.value = null
  }
  catch (error) {
    toast.add({
      title: (error as { statusMessage?: string }).statusMessage ?? 'Action impossible',
      color: 'error',
    })
  }
  finally {
    submitting.value = false
  }
}

async function onDelete(item: IngredientView) {
  if (!confirm(`Supprimer « ${item.name} » ?`)) return
  try {
    await api.remove(item.id)
    toast.add({ title: 'Ingrédient supprimé', color: 'success' })
    await refresh()
  }
  catch (error) {
    toast.add({
      title: (error as { statusMessage?: string }).statusMessage ?? 'Suppression impossible',
      color: 'error',
    })
  }
}

const storageOptions = [
  { label: 'Tout', value: undefined },
  ...(Object.keys(STORAGE_LABELS) as IngredientStorage[]).map((value) => ({
    label: STORAGE_LABELS[value],
    value,
  })),
]
const categoryOptions = [
  { label: 'Tous les rayons', value: undefined },
  ...CATEGORY_ORDER.map((value) => ({ label: CATEGORY_LABELS[value], value })),
]

interface ItemsByCategory {
  category: IngredientCategory
  label: string
  items: IngredientView[]
}

const grouped = computed<ItemsByCategory[]>(() => {
  const out: ItemsByCategory[] = []
  const list = items.value ?? []
  for (const cat of CATEGORY_ORDER) {
    const slice = list.filter((i) => i.category === cat)
    if (slice.length > 0) {
      out.push({ category: cat, label: CATEGORY_LABELS[cat], items: slice })
    }
  }
  return out
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <h1 class="text-2xl font-semibold">Ingrédients</h1>
      <UButton icon="i-lucide-plus" @click="openCreate">Nouveau</UButton>
    </div>

    <UCard>
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <UFormField label="Recherche">
          <UInput v-model="search" placeholder="Nom ou alias" icon="i-lucide-search" class="w-full" />
        </UFormField>
        <UFormField label="Stockage">
          <USelect v-model="storageFilter" :items="storageOptions" class="w-full" />
        </UFormField>
        <UFormField label="Rayon">
          <USelect v-model="categoryFilter" :items="categoryOptions" class="w-full" />
        </UFormField>
        <UFormField label="Archivés">
          <UCheckbox v-model="includeArchived" label="Inclure les ingrédients archivés" />
        </UFormField>
      </div>
    </UCard>

    <div v-if="pending && !items?.length" class="p-8 text-center text-gray-500">Chargement…</div>
    <div v-else-if="!items?.length" class="p-8 text-center text-gray-500">
      Aucun ingrédient — créez-en un avec le bouton « Nouveau ».
    </div>
    <div v-else class="space-y-6">
      <section v-for="group in grouped" :key="group.category">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">
          {{ group.label }}
        </h2>
        <UCard>
          <ul class="divide-y divide-gray-200 dark:divide-gray-800">
            <li v-for="ing in group.items" :key="ing.id">
              <NuxtLink
                :to="`/ingredients/${ing.id}`"
                class="py-3 px-2 -mx-2 rounded flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                :class="{ 'opacity-50': ing.archived }"
              >
                <div class="flex-1 min-w-0">
                  <p class="font-medium truncate">
                    {{ ing.name }}
                    <UBadge v-if="ing.archived" color="neutral" variant="subtle" class="ml-2">Archivé</UBadge>
                  </p>
                  <p class="text-xs text-gray-500">
                    {{ STORAGE_LABELS[ing.storage] }} · {{ ing.canonicalUnit }}
                    <span v-if="ing.aliases.length"> · alias : {{ ing.aliases.join(', ') }}</span>
                  </p>
                </div>
                <UButton
                  icon="i-lucide-barcode"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  title="Ajouter un produit / code-barre"
                  @click.prevent.stop="openAddProduct(ing)"
                />
                <UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  size="sm"
                  @click.prevent.stop="onDelete(ing)"
                />
              </NuxtLink>
            </li>
          </ul>
        </UCard>
      </section>
    </div>

    <UModal v-model:open="showForm" :title="editing ? 'Modifier l\'ingrédient' : 'Nouvel ingrédient'">
      <template #body>
        <IngredientsIngredientForm
          :initial="editing"
          :loading="submitting"
          @submit="onSubmit"
          @cancel="showForm = false"
        />
      </template>
    </UModal>

    <UModal
      v-model:open="showProductForm"
      :title="productTarget ? `Nouveau produit pour « ${productTarget.name} »` : 'Nouveau produit'"
    >
      <template #body>
        <IngredientsProductForm
          v-if="productTarget"
          :ingredient-canonical-unit="productTarget.canonicalUnit"
          :loading="submitting"
          @submit="onProductSubmit"
          @cancel="showProductForm = false"
        />
      </template>
    </UModal>
  </div>
</template>
