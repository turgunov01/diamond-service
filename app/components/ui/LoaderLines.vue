<script setup lang="ts">
const props = withDefaults(defineProps<{
  lines?: number
  size?: 'sm' | 'md'
  rounded?: boolean
  gap?: string
}>(), {
  lines: 3,
  size: 'md',
  rounded: true,
  gap: '0.5rem'
})

const lineClass = computed(() => props.size === 'sm' ? 'h-3' : 'h-4')
</script>

<template>
  <div
    class="space-y-2"
    :style="{ gap: props.gap }"
  >
    <div
      v-for="n in props.lines"
      :key="n"
      :class="[
        'w-full bg-default/70 animate-pulse',
        lineClass,
        props.rounded ? 'rounded' : ''
      ]"
    />
  </div>
</template>
