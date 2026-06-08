<script setup lang="ts">
// Affordances PWA : invite d'installation (« Ajouter à l'écran d'accueil ») et
// notification de mise à jour. Le service worker est en `autoUpdate`, mais on
// laisse l'utilisateur déclencher le rechargement explicitement pour ne pas
// interrompre une saisie en cours. Tout est piloté par `$pwa` injecté par
// @vite-pwa/nuxt (présent uniquement côté client).
const { $pwa } = useNuxtApp()
</script>

<template>
  <div
    v-if="$pwa"
    class="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-3 pointer-events-none sm:items-end"
  >
    <UAlert
      v-if="$pwa.needRefresh"
      class="max-w-sm pointer-events-auto shadow-lg"
      color="primary"
      variant="solid"
      icon="i-lucide-refresh-cw"
      title="Mise à jour disponible"
      description="Une nouvelle version de Meal Manager est prête."
      :actions="[
        {
          label: 'Recharger',
          color: 'neutral',
          variant: 'solid',
          onClick: () => $pwa.updateServiceWorker(),
        },
        {
          label: 'Plus tard',
          color: 'neutral',
          variant: 'ghost',
          onClick: () => $pwa.cancelPrompt(),
        },
      ]"
    />

    <UAlert
      v-else-if="$pwa.showInstallPrompt && !$pwa.isPWAInstalled"
      class="max-w-sm pointer-events-auto shadow-lg"
      color="primary"
      variant="subtle"
      icon="i-lucide-download"
      title="Installer Meal Manager"
      description="Ajoutez l'application à votre écran d'accueil pour un accès rapide."
      :actions="[
        {
          label: 'Installer',
          color: 'primary',
          variant: 'solid',
          onClick: () => $pwa.install(),
        },
        {
          label: 'Non merci',
          color: 'neutral',
          variant: 'ghost',
          onClick: () => $pwa.cancelInstall(),
        },
      ]"
    />
  </div>
</template>
