<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const toast = useToast()

const open = ref(false)

const { data: links } = await useFetch<NavigationMenuItem[][]>('/api/routes/sidebar', {
  default: () => [[], []] as NavigationMenuItem[][]
})

const groups = computed<any[]>(() => [
  {
    id: 'links',
    label: 'Перейти',
    items: (links.value ?? []).flat()
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
    ]
  }
])

const activeObject = useState<{ id: number, name: string } | null>('active-object', () => null)

const { data: objects } = await useFetch<{ id: number, name: string }[]>('/api/objects', {
  default: () => []
})

watch(objects, (list) => {
  if (activeObject.value || !list?.length) {
    return
  }

  const [firstObject] = list
  if (!firstObject) {
    return
  }

  activeObject.value = {
    id: firstObject.id,
    name: firstObject.name
  }
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
