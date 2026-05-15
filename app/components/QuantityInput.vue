<script setup lang="ts">
import { UNITS } from '../../shared/units/conversions'

interface QuantityValue {
  value: number
  unit: string
}

const props = defineProps<{
  modelValue: QuantityValue
}>()

const emit = defineEmits<{
  'update:modelValue': [value: QuantityValue]
}>()

const unitOptions = Object.values(UNITS)
  .filter((u, idx, arr) => arr.findIndex((x) => x.symbol === u.symbol) === idx)
  .map((u) => ({ label: u.symbol, value: u.symbol }))

const valueModel = computed({
  get: () => props.modelValue.value,
  set: (v: number) => emit('update:modelValue', { ...props.modelValue, value: Number(v) || 0 }),
})

const unitModel = computed({
  get: () => props.modelValue.unit,
  set: (u: string) => emit('update:modelValue', { ...props.modelValue, unit: u }),
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
