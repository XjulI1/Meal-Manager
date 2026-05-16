<script setup lang="ts">
import { UNITS, type CanonicalUnit, type Dimension } from '../../shared/units/conversions'

interface QuantityValue {
  value: number
  unit: string
}

const props = defineProps<{
  modelValue: QuantityValue
  /** When set, only units of this dimension are offered. */
  dimension?: Dimension
}>()

const emit = defineEmits<{
  'update:modelValue': [value: QuantityValue]
}>()

const CANONICAL_TO_DIMENSION: Record<CanonicalUnit, Dimension> = {
  g: 'mass',
  ml: 'volume',
  unit: 'discrete',
}

const unitOptions = computed(() => {
  return Object.values(UNITS)
    .filter((u) => !props.dimension || u.dimension === props.dimension)
    .filter((u, idx, arr) => arr.findIndex((x) => x.symbol === u.symbol) === idx)
    .map((u) => ({ label: u.symbol, value: u.symbol }))
})

const valueModel = computed({
  get: () => props.modelValue.value,
  set: (v: number) => emit('update:modelValue', { ...props.modelValue, value: Number(v) || 0 }),
})

const unitModel = computed({
  get: () => props.modelValue.unit,
  set: (u: string) => emit('update:modelValue', { ...props.modelValue, unit: u }),
})

// If dimension changes and current unit no longer fits, snap to the canonical unit.
watch(() => props.dimension, (dim) => {
  if (!dim) return
  const current = UNITS[props.modelValue.unit.trim().toLowerCase()]
  if (!current || current.dimension !== dim) {
    const canonical = Object.entries(CANONICAL_TO_DIMENSION).find(([, d]) => d === dim)?.[0]
    if (canonical) {
      emit('update:modelValue', { ...props.modelValue, unit: canonical })
    }
  }
})
</script>

<template>
  <div class="flex gap-2">
    <UInput
      v-model.number="valueModel"
      type="number"
      min="0"
      step="0.01"
      class="flex-1"
      placeholder="Quantité"
    />
    <USelect
      v-model="unitModel"
      :items="unitOptions"
      class="w-28"
    />
  </div>
</template>
