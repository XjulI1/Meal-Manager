<script setup lang="ts">
import type { CreateIngredientDto } from '../../../shared/dto/ingredient'
import type { CreateProductDto } from '../../../shared/dto/product'
import { CATEGORY_LABELS, STORAGE_LABELS } from '../../composables/useApiIngredients'

definePageMeta({ title: 'Ingrédient' })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const ingredientsApi = useApiIngredients()
const productsApi = useApiProducts()

const id = computed(() => route.params.id as string)

const { data: ingredient, refresh, pending } = await useAsyncData(
  () => `ingredient-${id.value}`,
  () => ingredientsApi.get(id.value),
)

const showEdit = ref(false)
const showProductForm = ref(false)
const editingProductId = ref<string | null>(null)
const submitting = ref(false)

const editingProduct = computed(() =>
  editingProductId.value
    ? ingredient.value?.products.find((p) => p.id === editingProductId.value) ?? null
    : null,
)

async function onUpdate(payload: CreateIngredientDto) {
  if (!ingredient.value) return
  submitting.value = true
  try {
    await ingredientsApi.update(ingredient.value.id, payload)
    toast.add({ title: 'Ingrédient mis à jour', color: 'success' })
    showEdit.value = false
    await refresh()
  }
  catch (error) {
    toast.add({
      title: (error as { statusMessage?: string }).statusMessage ?? 'Mise à jour impossible',
      color: 'error',
    })
  }
  finally {
    submitting.value = false
  }
}

async function onProductSubmit(payload: CreateProductDto) {
  if (!ingredient.value) return
  submitting.value = true
  try {
    if (editingProduct.value) {
      await productsApi.update(editingProduct.value.id, payload)
      toast.add({ title: 'Produit mis à jour', color: 'success' })
    }
    else {
      await productsApi.addToIngredient(ingredient.value.id, payload)
      toast.add({ title: 'Produit ajouté', color: 'success' })
    }
    showProductForm.value = false
    editingProductId.value = null
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

async function onProductDelete(productId: string) {
  if (!confirm('Supprimer ce produit (et ses codes-barres) ?')) return
  try {
    await productsApi.remove(productId)
    toast.add({ title: 'Produit supprimé', color: 'success' })
    await refresh()
  }
  catch (error) {
    toast.add({
      title: (error as { statusMessage?: string }).statusMessage ?? 'Suppression impossible',
      color: 'error',
    })
  }
}

async function onDelete() {
  if (!ingredient.value) return
  if (!confirm(`Supprimer « ${ingredient.value.name} » ?`)) return
  try {
    await ingredientsApi.remove(ingredient.value.id)
    toast.add({ title: 'Ingrédient supprimé', color: 'success' })
    await router.push('/ingredients')
  }
  catch (error) {
    toast.add({
      title: (error as { statusMessage?: string }).statusMessage ?? 'Suppression impossible',
      color: 'error',
    })
  }
}

function openAddProduct() {
  editingProductId.value = null
  showProductForm.value = true
}

function openEditProduct(productId: string) {
  editingProductId.value = productId
  showProductForm.value = true
}
</script>

<template>
  <div v-if="pending && !ingredient" class="p-8 text-center text-gray-500">Chargement…</div>
  <div v-else-if="!ingredient" class="p-8 text-center text-gray-500">Ingrédient introuvable.</div>
  <div v-else class="space-y-6">
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <NuxtLink to="/ingredients" class="text-sm text-gray-500 hover:underline">
          ← Tous les ingrédients
        </NuxtLink>
        <h1 class="text-2xl font-semibold mt-1">{{ ingredient.name }}</h1>
        <p class="text-sm text-gray-500">
          {{ CATEGORY_LABELS[ingredient.category] }} · {{ STORAGE_LABELS[ingredient.storage] }} · {{ ingredient.canonicalUnit }}
        </p>
      </div>
      <div class="flex gap-2">
        <UButton color="neutral" variant="ghost" icon="i-lucide-pencil" @click="showEdit = true">
          Modifier
        </UButton>
        <UButton color="error" variant="ghost" icon="i-lucide-trash-2" @click="onDelete">
          Supprimer
        </UButton>
      </div>
    </div>

    <UCard>
      <template #header>
        <h2 class="text-base font-semibold">Détails</h2>
      </template>
      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm">
        <div>
          <dt class="text-gray-500">Alias</dt>
          <dd>{{ ingredient.aliases.length ? ingredient.aliases.join(', ') : '—' }}</dd>
        </div>
        <div>
          <dt class="text-gray-500">Allergènes</dt>
          <dd>{{ ingredient.allergens.length ? ingredient.allergens.join(', ') : '—' }}</dd>
        </div>
        <div>
          <dt class="text-gray-500">Conservation (jours)</dt>
          <dd>{{ ingredient.shelfLifeDays ?? '—' }}</dd>
        </div>
        <div>
          <dt class="text-gray-500">Conditionnement par défaut</dt>
          <dd>{{ ingredient.defaultPackSize ? `${ingredient.defaultPackSize} ${ingredient.canonicalUnit}` : '—' }}</dd>
        </div>
      </dl>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-base font-semibold">Produits / codes-barres</h2>
          <UButton size="sm" icon="i-lucide-plus" @click="openAddProduct">Ajouter un produit</UButton>
        </div>
      </template>
      <div v-if="!ingredient.products.length" class="text-sm text-gray-500 py-3">
        Aucun produit. Ajoutez-en un pour permettre la résolution par scan.
      </div>
      <ul v-else class="divide-y divide-gray-200 dark:divide-gray-800">
        <li v-for="product in ingredient.products" :key="product.id" class="py-3 flex items-center gap-3">
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">
              {{ product.brand ?? 'Sans marque' }} — {{ product.packSize }} {{ product.packUnit }}
            </p>
            <p class="text-xs text-gray-500 font-mono">{{ product.barcodes.join(', ') }}</p>
          </div>
          <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" size="sm" @click="openEditProduct(product.id)" />
          <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="sm" @click="onProductDelete(product.id)" />
        </li>
      </ul>
    </UCard>

    <UModal v-model:open="showEdit" title="Modifier l'ingrédient">
      <template #body>
        <IngredientsIngredientForm
          :initial="ingredient"
          :loading="submitting"
          @submit="onUpdate"
          @cancel="showEdit = false"
        />
      </template>
    </UModal>

    <UModal v-model:open="showProductForm" :title="editingProduct ? 'Modifier le produit' : 'Nouveau produit'">
      <template #body>
        <IngredientsProductForm
          :ingredient-canonical-unit="ingredient.canonicalUnit"
          :initial="editingProduct"
          :loading="submitting"
          @submit="onProductSubmit"
          @cancel="showProductForm = false"
        />
      </template>
    </UModal>
  </div>
</template>
