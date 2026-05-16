<script setup lang="ts">
const items = [
  { to: '/menu', label: 'Menu', icon: 'i-lucide-calendar-days' },
  { to: '/inventory', label: 'Inventaire', icon: 'i-lucide-package' },
  { to: '/recipes', label: 'Recettes', icon: 'i-lucide-book-open' },
  { to: '/ingredients', label: 'Ingrédients', icon: 'i-lucide-carrot' },
  { to: '/shopping', label: 'Courses', icon: 'i-lucide-shopping-cart' },
]
</script>

<template>
  <nav class="flex flex-col h-full p-4 gap-1">
    <div class="px-2 py-3 mb-2">
      <p class="text-lg font-semibold">Meal Manager</p>
    </div>
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      active-class="bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300"
    >
      <UIcon :name="item.icon" class="size-5" />
      <span>{{ item.label }}</span>
    </NuxtLink>
  </nav>
</template>
