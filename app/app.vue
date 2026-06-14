<script setup lang="ts">
useHead({ title: 'Meal Manager' })
</script>

<template>
  <UApp>
    <!-- Injecte <link rel="manifest"> côté client. En SPA (`ssr: false`), c'est
         le mécanisme officiel @vite-pwa/nuxt : le module retire tout lien
         manifest statique du head pour le gérer ici (évite les doublons). -->
    <VitePwaManifest />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <PwaPrompt />
  </UApp>
</template>
