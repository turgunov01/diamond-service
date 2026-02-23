<script setup lang="ts">
import type { Zone, Customer } from '~/types'

const toast = useToast()
const selectedZone = ref<Zone | null>(null)
const isLoading = ref(false)
const pinnedUsersLoading = ref<Record<number, boolean>>({})
const selectedUserForPin = ref<Customer | null>(null)
const isPinMenuOpen = ref(false)

const { data: zones } = await useFetch<Zone[]>('/api/zones', {
  default: () => []
})

const { data: customers, refresh: refreshCustomers } = await useFetch<Customer[]>('/api/customers', {
  default: () => [],
  lazy: true
})

const pinnedUsers = computed(() => {
  if (!selectedZone.value || !customers.value) {
    return []
  }
  return customers.value.filter(c => c.objectPinned === selectedZone.value?.name)
})

const availableUsers = computed(() => {
  if (!customers.value || !selectedZone.value) {
    return []
  }
  return customers.value.filter(c => c.objectPinned !== selectedZone.value?.name)
})

async function pinUserToZone(user: Customer, zone: Zone) {
  if (!zone) return

  pinnedUsersLoading.value[user.id] = true

  try {
    await $fetch('/api/zones/pin', {
      method: 'PATCH',
      body: {
        userId: user.id,
        zoneName: zone.name
      }
    })

    toast.add({
      title: 'Success',
      description: `${user.username} has been pinned to ${zone.name}`,
      icon: 'i-lucide-check',
      color: 'success'
    })

    await refreshCustomers()
    selectedUserForPin.value = null
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to pin user to zone',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  } finally {
    pinnedUsersLoading.value[user.id] = false
  }
}

function selectZone(zone: Zone) {
  selectedZone.value = zone
}

onMounted(() => {
  if (zones.value && zones.value.length > 0) {
    selectedZone.value = zones.value[0]
  }
})
</script>

<template>
  <UDashboardPanel id="zones">
    <template #header>
      <UDashboardNavbar title="Zones Management" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
      <!-- Zones List -->
      <div class="lg:col-span-1">
        <UPageCard
          title="Зоны"
          description="Select a zone to manage users"
          variant="subtle"
          :ui="{ container: 'p-0', wrapper: 'gap-y-0' }"
        >
          <div class="divide-y divide-default">
            <button
              v-for="zone in zones"
              :key="zone.id"
              :class="[
                'w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
                selectedZone?.id === zone.id && 'bg-gray-100 dark:bg-gray-750 border-l-2 border-primary'
              ]"
              @click="selectZone(zone)"
            >
              <div class="font-semibold text-sm">{{ zone.name }}</div>
              <div v-if="zone.description" class="text-xs text-gray-500 mt-1">
                {{ zone.description }}
              </div>
              <div class="text-xs text-gray-400 mt-2">
                {{
                  customers?.filter(c => c.objectPinned === zone.name).length || 0
                }} user(s)
              </div>
            </button>
          </div>
        </UPageCard>
      </div>

      <!-- Zone Details and Users -->
      <div class="lg:col-span-2">
        <div v-if="selectedZone" class="space-y-4">
          <!-- Zone Header -->
          <UPageCard
            :title="`${selectedZone.name}`"
            :description="selectedZone.description || 'No description'"
            variant="naked"
            orientation="horizontal"
            class="mb-4"
          >
            <UButton
              label="Pin User"
              color="primary"
              @click="isPinMenuOpen = true"
            />
          </UPageCard>

          <!-- Pinned Users -->
          <UPageCard
            title="Assigned Users"
            :description="`${pinnedUsers.length} user(s) assigned to this zone`"
            variant="subtle"
          >
            <div v-if="pinnedUsers.length > 0" class="space-y-3">
              <div
                v-for="user in pinnedUsers"
                :key="user.id"
                class="flex items-center justify-between p-3 border border-default rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div class="flex items-center gap-3">
                  <UAvatar
                    :src="user.avatar.src"
                    :alt="user.username"
                    size="md"
                  />
                  <div>
                    <div class="font-semibold text-sm">{{ user.username }}</div>
                    <div class="text-xs text-gray-500">
                      Age: {{ user.age }}, Shift: {{ user.workShift }}
                    </div>
                  </div>
                </div>
                <UBadge color="primary"> Pinned </UBadge>
              </div>
            </div>
            <div v-else class="py-8 text-center">
              <p class="text-gray-500">No users assigned yet</p>
            </div>
          </UPageCard>

          <!-- Pin User Modal/Popover -->
          <div v-if="isPinMenuOpen" class="fixed inset-0 z-50 flex items-center justify-center">
            <div
              class="fixed inset-0 bg-black/50"
              @click="isPinMenuOpen = false"
            />
            <UPageCard
              title="Select User to Pin"
              description="Choose an unassigned user"
              variant="subtle"
              :ui="{ container: 'relative z-10 max-w-md' }"
            >
              <div class="space-y-2 max-h-96 overflow-y-auto">
                <div
                  v-if="availableUsers.length > 0"
                  class="space-y-2"
                >
                  <button
                    v-for="user in availableUsers"
                    :key="user.id"
                    class="w-full text-left p-3 border border-default rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
                    :disabled="pinnedUsersLoading[user.id]"
                    @click="pinUserToZone(user, selectedZone)"
                  >
                    <div class="flex items-center gap-3">
                      <UAvatar
                        :src="user.avatar.src"
                        :alt="user.username"
                        size="sm"
                      />
                      <div>
                        <div class="font-semibold text-sm">{{ user.username }}</div>
                      </div>
                    </div>
                    <UIcon
                      v-if="pinnedUsersLoading[user.id]"
                      name="i-lucide-loader"
                      class="animate-spin"
                    />
                    <UIcon
                      v-else
                      name="i-lucide-check"
                      class="text-gray-300"
                    />
                  </button>
                </div>
                <div v-else class="py-8 text-center text-gray-500">
                  All users are already assigned
                </div>
              </div>

              <template #footer>
                <UButton
                  label="Close"
                  color="gray"
                  block
                  @click="isPinMenuOpen = false"
                />
              </template>
            </UPageCard>
          </div>
        </div>

        <div v-else class="flex items-center justify-center h-96">
          <p class="text-gray-500">Select a zone to manage users</p>
        </div>
      </div>
    </div>
  </UDashboardPanel>
</template>
