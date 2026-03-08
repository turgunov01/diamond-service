<script setup lang="ts">
type ObjectItem = {
  id: number
  building_id?: number | null
  name: string
  description?: string | null
  address?: string | null
  code?: string | null
}

const router = useRouter()
const toast = useToast()
const activeBuilding = useState<{ id: number, name: string } | null>('active-building')
const activeObject = useState<{ id: number, name: string } | null>('active-object')
const visibleObjects = useState<number[]>('visible-objects', () => [])

const { data: objects, error, status } = await useFetch<ObjectItem[]>('/api/objects', {
  default: () => [],
  query: {
    buildingId: computed(() => activeBuilding.value?.id)
  }
})

watch(error, (value) => {
  if (!value) {
    return
  }

  const fetchError = value as { data?: { statusMessage?: string }, message?: string }

  toast.add({
    title: 'Failed to load objects',
    description: fetchError.data?.statusMessage || fetchError.message,
    color: 'error'
  })
}, { immediate: true })

function openCreatePage() {
  if (!activeBuilding.value?.id) {
    toast.add({
      title: 'Select a building first',
      color: 'warning'
    })
    return
  }

  router.push('/objects/create')
}

function toggleObject(item: ObjectItem, enabled: boolean) {
  const current = new Set(visibleObjects.value)

  if (enabled) {
    current.add(item.id)
    visibleObjects.value = Array.from(current)

    if (!activeObject.value) {
      activeObject.value = { id: item.id, name: item.name }
    }

    toast.add({
      title: 'Object activated',
      description: item.name,
      color: 'success'
    })
    return
  }

  // Disable
  current.delete(item.id)
  visibleObjects.value = Array.from(current)

  if (activeObject.value?.id === item.id) {
    activeObject.value = null
  }

  toast.add({
    title: 'Object deactivated',
    description: item.name,
    color: 'info'
  })
}
</script>

<template>
  <UDashboardPanel id="objects">
    <template #header>
      <UDashboardNavbar title="Objects">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            icon="i-lucide-plus"
            label="Create Object"
            @click="openCreatePage"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="rounded-lg border border-default overflow-x-auto">
        <div class="border-b border-default px-3 py-2 text-sm text-muted">
          {{ activeBuilding?.name ? `Building: ${activeBuilding.name}` : 'No building selected' }}
        </div>

        <table class="min-w-full text-sm">
          <thead>
            <tr class="bg-elevated/50">
              <th class="px-3 py-2 text-left">
                ID
              </th>
              <th class="px-3 py-2 text-left">
                Name
              </th>
              <th class="px-3 py-2 text-left">
                Address
              </th>
              <th class="px-3 py-2 text-left">
                Description
              </th>
              <th class="px-3 py-2 text-left">
                Code
              </th>
              <th class="px-3 py-2 text-left">
                Status
              </th>
              <th class="px-3 py-2 text-right">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="item in objects"
              :key="item.id"
              class="border-t border-default"
            >
              <td class="px-3 py-2">
                {{ item.id }}
              </td>
              <td class="px-3 py-2 font-medium">
                {{ item.name }}
              </td>
              <td class="px-3 py-2">
                {{ item.address || '-' }}
              </td>
              <td class="px-3 py-2">
                {{ item.description || '-' }}
              </td>
              <td class="px-3 py-2">
                {{ item.code || '-' }}
              </td>
              <td class="px-3 py-2">
                  <UBadge
                    :label="visibleObjects.includes(item.id) ? 'Active' : 'Inactive'"
                    :color="visibleObjects.includes(item.id) ? 'primary' : 'neutral'"
                    variant="subtle"
                  />
              </td>
              <td class="px-3 py-2 text-right">
                <div class="flex justify-end">
                  <USwitch
                    :model-value="visibleObjects.includes(item.id)"
                    @update:model-value="toggleObject(item, $event)"
                  />
                </div>
              </td>
            </tr>

            <tr v-if="status === 'pending'">
              <td class="px-3 py-4 text-muted" colspan="7">
                Loading objects...
              </td>
            </tr>

            <tr v-else-if="!objects.length">
              <td class="px-3 py-4 text-muted" colspan="7">
                {{ activeBuilding?.name ? 'No objects found for this building.' : 'Select a building to see objects.' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </UDashboardPanel>
</template>
