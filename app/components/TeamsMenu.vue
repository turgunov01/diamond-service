<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
}>()

const teams = ref([{
  label: 'Tashkent City Mall',
  avatar: {
    src: 'https://api.logobank.uz/media/logos_preview/TCM-01.jpg',
    alt: 'Tashkent City Mall'
  }
}, {
  label: 'Summit Business Center',
  avatar: {
    src: 'https://bcsummit.uz/dist/assets/images/logo.svg',
    alt: 'Summit Business Center'
  }
}, {
  label: 'JW Marriott Hotel Tashkent',
  avatar: {
    src: 'https://banner2.cleanpng.com/20180603/bvg/avonlllgv.webp',
    alt: 'JW Marriott Hotel Tashkent'
  }
}])
const selectedTeam = ref(teams.value[0])

const items = computed<DropdownMenuItem[][]>(() => {
  return [teams.value.map(team => ({
    ...team,
    onSelect() {
      selectedTeam.value = team
    }
  })), [{
    label: 'Создать объект',
    icon: 'i-lucide-circle-plus'
  }, {
    label: 'Мои объекты',
    icon: 'i-lucide-cog'
  }]]
})
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-40' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      v-bind="{
        ...selectedTeam,
        label: collapsed ? undefined : selectedTeam?.label,
        trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down'
      }"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :class="[!collapsed && 'py-2']"
      :ui="{
        trailingIcon: 'text-dimmed'
      }"
    />
  </UDropdownMenu>
</template>
