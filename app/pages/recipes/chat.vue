<script setup lang="ts">
import type { DraftResolutionDto } from '../../../shared/dto/recipe-chat'
import { MAX_RECIPE_PHOTOS } from '../../../shared/dto/recipe-chat'
import type { ChatSource } from '../../composables/useApiRecipeChat'

definePageMeta({ title: 'Assistant recettes' })

const { aiEnabled, streamChat, importUrl, importPhotos, resolveDraft, toPrefill } = useApiRecipeChat()
const prefill = useRecipePrefill()
const toast = useToast()

interface ChatMessage { role: 'user' | 'assistant', content: string }

const messages = ref<ChatMessage[]>([])
const input = ref('')
const sending = ref(false)
const sources = ref<ChatSource[]>([])
const resolution = ref<DraftResolutionDto | null>(null)
const urlInput = ref('')
const importing = ref(false)
const photoFiles = ref<File[]>([])
const importingPhotos = ref(false)
const ACCEPTED_PHOTO_TYPES = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif'

async function send() {
  const text = input.value.trim()
  if (!text || sending.value) return
  input.value = ''
  messages.value.push({ role: 'user', content: text })
  const history = messages.value.map((m) => ({ role: m.role, content: m.content }))
  const placeholder = reactive<ChatMessage>({ role: 'assistant', content: '' })
  messages.value.push(placeholder)
  sending.value = true
  try {
    await streamChat(history, (ev) => {
      if (ev.type === 'text') placeholder.content += ev.text
      else if (ev.type === 'sources') sources.value = ev.sources
      else if (ev.type === 'draft') void applyDraft(ev.draft)
      else if (ev.type === 'error') toast.add({ title: ev.message, color: 'error' })
    })
    if (!placeholder.content) placeholder.content = '(réponse vide)'
  }
  catch (error) {
    toast.add({ title: (error as { statusMessage?: string }).statusMessage ?? 'Chat indisponible', color: 'error' })
  }
  finally {
    sending.value = false
  }
}

async function applyDraft(draft: Parameters<typeof resolveDraft>[0]) {
  try {
    resolution.value = await resolveDraft(draft)
  }
  catch {
    toast.add({ title: 'Résolution des ingrédients impossible', color: 'error' })
  }
}

async function doImport() {
  const url = urlInput.value.trim()
  if (!url || importing.value) return
  importing.value = true
  try {
    const draft = await importUrl(url)
    resolution.value = await resolveDraft(draft)
    toast.add({ title: 'Recette importée', color: 'success' })
  }
  catch (error) {
    toast.add({ title: (error as { statusMessage?: string }).statusMessage ?? 'Import impossible', color: 'error' })
  }
  finally {
    importing.value = false
  }
}

function onPhotosSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  if (files.length > MAX_RECIPE_PHOTOS) {
    toast.add({ title: `${MAX_RECIPE_PHOTOS} photos maximum`, color: 'warning' })
    photoFiles.value = files.slice(0, MAX_RECIPE_PHOTOS)
  }
  else {
    photoFiles.value = files
  }
}

async function doImportPhotos() {
  if (!photoFiles.value.length || importingPhotos.value) return
  importingPhotos.value = true
  try {
    const draft = await importPhotos(photoFiles.value)
    resolution.value = await resolveDraft(draft)
    photoFiles.value = []
    toast.add({ title: 'Recette interprétée — vérifiez le brouillon', color: 'success' })
  }
  catch (error) {
    toast.add({ title: (error as { statusMessage?: string }).statusMessage ?? 'Interprétation impossible', color: 'error' })
  }
  finally {
    importingPhotos.value = false
  }
}

function continueToForm() {
  if (!resolution.value) return
  prefill.value = toPrefill(resolution.value)
  navigateTo('/recipes/new')
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-3">
      <UButton to="/recipes" icon="i-lucide-arrow-left" color="neutral" variant="ghost" />
      <h1 class="text-2xl font-semibold">Assistant recettes</h1>
    </div>

    <UAlert
      v-if="!aiEnabled"
      icon="i-lucide-sparkles"
      color="warning"
      title="Fonctionnalité IA désactivée"
      description="L'assistant IA n'est pas activé pour ce compte. Activez `ai_enabled` en base pour y accéder."
    />

    <template v-else>
      <!-- Import depuis une URL -->
      <UCard>
        <div class="flex flex-col sm:flex-row gap-2">
          <UInput
            v-model="urlInput"
            placeholder="Coller l'URL d'une recette à importer…"
            icon="i-lucide-link"
            class="flex-1"
            @keydown.enter="doImport"
          />
          <UButton :loading="importing" icon="i-lucide-download" @click="doImport">Importer</UButton>
        </div>
      </UCard>

      <!-- Import depuis une ou plusieurs photos -->
      <UCard>
        <div class="space-y-2">
          <div class="flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              type="file"
              :accept="ACCEPTED_PHOTO_TYPES"
              multiple
              capture="environment"
              class="flex-1 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary-500 file:px-3 file:py-1.5 file:text-white"
              @change="onPhotosSelected"
            >
            <UButton
              :loading="importingPhotos"
              :disabled="!photoFiles.length"
              icon="i-lucide-camera"
              @click="doImportPhotos"
            >Interpréter</UButton>
          </div>
          <p class="text-xs text-gray-500">
            Photographiez une recette (livre, fiche…). Jusqu'à {{ MAX_RECIPE_PHOTOS }} photos d'une même recette (JPEG, PNG, WebP, HEIC).
          </p>
          <p v-if="photoFiles.length" class="text-xs text-gray-600 dark:text-gray-300">
            {{ photoFiles.length }} photo(s) sélectionnée(s) : {{ photoFiles.map((f) => f.name).join(', ') }}
          </p>
        </div>
      </UCard>

      <!-- Conversation -->
      <UCard>
        <div v-if="!messages.length" class="p-6 text-center text-gray-500">
          Décrivez ce que vous voulez cuisiner, ou demandez une suggestion.
        </div>
        <ul v-else class="space-y-3">
          <li v-for="(m, i) in messages" :key="i" class="flex" :class="m.role === 'user' ? 'justify-end' : 'justify-start'">
            <div
              class="max-w-[80%] rounded-lg px-3 py-2 whitespace-pre-wrap text-sm"
              :class="m.role === 'user' ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-800'"
            >{{ m.content }}<span v-if="m.role === 'assistant' && sending && i === messages.length - 1" class="opacity-50">▌</span></div>
          </li>
        </ul>

        <div v-if="sources.length" class="mt-3 text-xs text-gray-500">
          <p class="font-medium">Sources :</p>
          <ul class="list-disc pl-4">
            <li v-for="s in sources" :key="s.url">
              <a :href="s.url" target="_blank" rel="noopener" class="underline">{{ s.title ?? s.url }}</a>
            </li>
          </ul>
        </div>

        <template #footer>
          <div class="flex gap-2">
            <UInput
              v-model="input"
              :disabled="sending"
              placeholder="Votre message…"
              class="flex-1"
              @keydown.enter="send"
            />
            <UButton :loading="sending" icon="i-lucide-send" @click="send">Envoyer</UButton>
          </div>
        </template>
      </UCard>

      <!-- Brouillon résolu -->
      <UCard v-if="resolution">
        <template #header>
          <div class="flex items-center justify-between gap-2">
            <h2 class="font-semibold">{{ resolution.title }}</h2>
            <UButton icon="i-lucide-arrow-right" @click="continueToForm">Pré-remplir le formulaire</UButton>
          </div>
        </template>
        <p class="text-sm text-gray-500 mb-2">{{ resolution.servings ?? '?' }} portion(s)</p>
        <ul class="space-y-1 text-sm">
          <li v-for="(ing, i) in resolution.ingredients" :key="i" class="flex items-center gap-2">
            <UIcon
              :name="ing.status === 'matched' ? 'i-lucide-check' : 'i-lucide-plus-circle'"
              :class="ing.status === 'matched' ? 'text-green-500' : 'text-amber-500'"
            />
            <span>
              {{ ing.name }}
              <span v-if="ing.quantity" class="text-gray-500">— {{ ing.quantity.value }} {{ ing.quantity.unit }}</span>
              <span v-if="ing.status === 'matched'" class="text-green-600 dark:text-green-400"> → {{ ing.ingredientName }}</span>
              <span v-else class="text-amber-600 dark:text-amber-400"> → à créer ({{ ing.canonicalUnit }})</span>
            </span>
          </li>
        </ul>
        <p class="mt-3 text-xs text-gray-500">
          Les ingrédients « à créer » devront être ajoutés au catalogue avant l'enregistrement.
        </p>
      </UCard>
    </template>
  </div>
</template>
