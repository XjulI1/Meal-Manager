<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'

const emit = defineEmits<{
  scan: [code: string]
  close: []
}>()

const open = defineModel<boolean>('open', { default: false })

const scanner = useBarcodeScanner()
const videoEl = ref<HTMLVideoElement | null>(null)

scanner.onScan((code) => {
  emit('scan', code)
})

watch(open, async (isOpen) => {
  if (isOpen) {
    scanner.reset()
    // Wait one tick so the <video> in the modal body is mounted.
    await nextTick()
    if (videoEl.value) await scanner.start(videoEl.value)
  }
  else {
    scanner.stop()
  }
}, { immediate: false })

onUnmounted(() => scanner.stop())

const ERROR_MESSAGES: Record<NonNullable<typeof scanner.error.value>, string> = {
  'insecure-context': 'Le scan nécessite une connexion sécurisée (HTTPS).',
  'permission-denied': 'L’accès à la caméra a été refusé.',
  'no-camera': 'Aucune caméra disponible sur cet appareil.',
  'detector-failed': 'La détection de code-barres a échoué.',
}
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-md' }" title="Scanner un code-barres">
    <template #body>
      <div class="space-y-3">
        <div class="relative aspect-square bg-black rounded-lg overflow-hidden">
          <video
            ref="videoEl"
            class="w-full h-full object-cover"
            autoplay
            muted
            playsinline
          />
          <!-- Viewfinder overlay -->
          <div class="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div class="w-2/3 h-1/4 border-2 border-white/80 rounded" />
          </div>
        </div>

        <div class="text-sm text-center min-h-[1.5rem]">
          <p v-if="scanner.state.value === 'initializing'" class="text-gray-500">
            Initialisation de la caméra…
          </p>
          <p v-else-if="scanner.state.value === 'scanning'" class="text-gray-600">
            Pointez vers un code-barres
          </p>
          <p v-else-if="scanner.state.value === 'scanned'" class="text-green-600 font-medium">
            Code détecté : {{ scanner.lastCode.value }}
          </p>
          <p v-else-if="scanner.state.value === 'error' && scanner.error.value" class="text-red-600">
            {{ ERROR_MESSAGES[scanner.error.value] }}
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton color="neutral" variant="ghost" @click="open = false; emit('close')">Annuler</UButton>
      </div>
    </template>
  </UModal>
</template>
