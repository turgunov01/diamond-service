<script setup lang="ts">
import type { CommandPaletteGroup, CommandPaletteItem, NavigationMenuItem } from '@nuxt/ui'

type BuildingItem = {
  id: number
  name: string
  logo?: string | null
  description?: string | null
}

type ObjectItem = {
  id: number
  name: string
}

const route = useRoute()
const toast = useToast()

const open = ref(false)

const { data: links } = await useFetch<NavigationMenuItem[][]>('/api/routes/sidebar', {
  default: () => [[], []] as NavigationMenuItem[][]
})

const groups = computed<CommandPaletteGroup<CommandPaletteItem>[]>(() => [
  {
    id: 'links',
    label: 'Перейти',
    items: ((links.value ?? []).flat() as CommandPaletteItem[])
  },
  {
    id: 'code',
    label: 'Код',
    items: [
      {
        id: 'source',
        label: 'Открыть исходник страницы',
        icon: 'i-simple-icons-github',
        to: `https://github.com/nuxt-ui-templates/dashboard/blob/main/app/pages${route.path === '/' ? '/index' : route.path}.vue`,
        target: '_blank'
      }
    ] as CommandPaletteItem[]
  }
])

const activeBuilding = useState<BuildingItem | null>('active-building', () => null)
const activeObject = useState<ObjectItem | null>('active-object', () => null)
const activeBuildingIdCookie = useCookie<number | null>('active-building-id', { default: () => null })
const activeObjectIdCookie = useCookie<number | null>('active-object-id', { default: () => null })

const { data: buildings } = await useFetch<BuildingItem[]>('/api/buildings', {
  default: () => []
})

const { data: objects } = await useFetch<ObjectItem[]>('/api/objects', {
  default: () => [],
  query: {
    buildingId: computed(() => activeBuilding.value?.id)
  }
})

watch(buildings, (list) => {
  if (!list?.length) {
    activeBuilding.value = null
    activeObject.value = null
    return
  }

  const preferredId = activeBuilding.value?.id || activeBuildingIdCookie.value
  const nextBuilding = list.find(item => item.id === preferredId) || list[0] || null

  if (!nextBuilding) {
    activeBuilding.value = null
    return
  }

  if (activeBuilding.value?.id !== nextBuilding.id) {
    activeBuilding.value = nextBuilding
  }
}, { immediate: true })

watch(activeBuilding, (value) => {
  activeBuildingIdCookie.value = value?.id ?? null
})

watch(objects, (list) => {
  if (!list?.length) {
    activeObject.value = null
    return
  }

  const preferredId = activeObject.value?.id || activeObjectIdCookie.value
  const nextObject = list.find(item => item.id === preferredId) || list[0] || null

  if (!nextObject) {
    activeObject.value = null
    return
  }

  if (activeObject.value?.id !== nextObject.id) {
    activeObject.value = {
      id: nextObject.id,
      name: nextObject.name
    }
  }
}, { immediate: true })

watch(activeObject, (value) => {
  activeObjectIdCookie.value = value?.id ?? null
})

onMounted(() => {
  const cookie = useCookie('cookie-consent')
  if (cookie.value === 'accepted') {
    return
  }

  toast.add({
    title: 'Мы используем файлы cookie для улучшения вашего опыта на сайте.',
    duration: 0,
    close: false,
    actions: [
      {
        label: 'Принять',
        color: 'neutral',
        variant: 'outline',
        onClick: () => {
          cookie.value = 'accepted'
        }
      },
      {
        label: 'Отклонить',
        color: 'neutral',
        variant: 'ghost'
      }
    ]
  })
})
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <TeamsMenu :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton
          :collapsed="collapsed"
          class="bg-transparent ring-default"
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[1]"
          orientation="vertical"
          tooltip
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <slot />

    <NotificationsSlideover />
  </UDashboardGroup>
</template>
