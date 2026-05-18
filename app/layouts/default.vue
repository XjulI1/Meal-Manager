<script setup lang="ts">
const uiStore = useUiStore()
const route = useRoute()

watch(() => route.fullPath, () => {
  uiStore.closeSidebar()
})
</script>

<template>
  <div class="min-h-screen flex bg-gray-50 dark:bg-gray-900">
    <aside
      class="hidden lg:flex lg:flex-col w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
    >
      <AppSidebar />
    </aside>

    <UModal
      v-model:open="uiStore.sidebarOpen"
      :ui="{ content: 'sm:max-w-xs' }"
      title="Navigation"
      description="Menu principal de l'application."
    >
      <template #body>
        <AppSidebar />
      </template>
    </UModal>

    <div class="flex-1 flex flex-col min-w-0">
      <AppHeader />
      <main class="flex-1 p-4 lg:p-6 overflow-x-auto">
        <slot />
      </main>
    </div>
  </div>
</template>
