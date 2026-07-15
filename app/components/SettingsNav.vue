<script setup lang="ts">
const items = [
  { to: '/settings/tokens', label: 'Tokens d’accès', icon: 'i-lucide-key-round' },
  { to: '/settings/import', label: 'Import cave', icon: 'i-lucide-upload' },
]
</script>

<template>
  <div class="flex gap-1 border-b border-gray-200 dark:border-gray-800 overflow-x-auto overflow-y-hidden mb-6">
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      active-class="!border-primary-500 !text-primary-600 dark:!text-primary-400"
    >
      <UIcon :name="item.icon" class="size-4" />
      {{ item.label }}
    </NuxtLink>
  </div>
</template>
