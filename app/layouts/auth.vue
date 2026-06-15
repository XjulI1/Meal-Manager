<template>
  <div class="relative min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 overflow-hidden">
    <ClientOnly>
      <AuthBackground />
    </ClientOnly>
    <div class="relative z-10 w-full max-w-md">
      <div class="mb-6 text-center">
        <h1 class="text-2xl font-semibold">Meal Manager</h1>
        <p class="text-sm text-gray-500">Gestion familiale des repas</p>
      </div>
      <slot />
    </div>
  </div>
</template>
