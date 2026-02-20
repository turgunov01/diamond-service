<script setup lang="ts">
withDefaults(defineProps<{
  count?: number
  loading?: boolean
}>(), {
  count: 0,
  loading: false
})

const emit = defineEmits<{
  confirm: []
}>()

const open = ref(false)

function customerWord(count: number) {
  const mod10 = count % 10
  const mod100 = count % 100

  if (mod10 === 1 && mod100 !== 11) {
    return 'клиента'
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return 'клиента'
  }

  return 'клиентов'
}

function onSubmit() {
  open.value = false
  emit('confirm')
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`Удалить ${count} ${customerWord(count)}`"
    :description="`Вы уверены? Это действие нельзя отменить.`"
  >
    <slot />

    <template #body>
      <div class="flex justify-end gap-2">
        <UButton
          label="Отмена"
          color="neutral"
          variant="subtle"
          @click="open = false"
        />
        <UButton
          label="Удалить"
          color="error"
          variant="solid"
          :loading="loading"
          @click="onSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
