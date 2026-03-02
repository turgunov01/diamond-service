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
  if (!enabled && activeObject.value?.id !== item.id) {
    return
  }

  if (!enabled) {
    activeObject.value = null

    toast.add({
      title: 'Object deactivated',
      description: item.name,
      color: 'info'
    })
    return
  }

  if (activeObject.value?.id === item.id) {
    toast.add({
      title: 'Object is already selected',
      description: item.name,
      color: 'info'
    })
    return
  }

  activeObject.value = { id: item.id, name: item.name }

  toast.add({
    title: 'Active object updated',
    description: item.name,
    color: 'success'
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
                  :label="activeObject?.id === item.id ? 'Active' : 'Inactive'"
                  :color="activeObject?.id === item.id ? 'primary' : 'neutral'"
                  variant="subtle"
                />
              </td>
              <td class="px-3 py-2 text-right">
                <div class="flex justify-end">
                  <USwitch
                    :model-value="activeObject?.id === item.id"
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
