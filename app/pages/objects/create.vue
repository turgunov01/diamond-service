<script setup lang="ts">
type CreatedObject = {
  id: number
  name: string
}

const router = useRouter()
const toast = useToast()
const creating = ref(false)
const activeBuilding = useState<{ id: number, name: string } | null>('active-building')
const activeObject = useState<{ id: number, name: string } | null>('active-object')

const form = reactive({
  name: '',
  description: '',
  address: '',
  code: ''
})

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    const fetchError = error as { data?: { statusMessage?: string }, message?: string }
    return fetchError.data?.statusMessage || fetchError.message
  }

  return undefined
}

async function createObject() {
  if (creating.value) {
    return
  }

  if (!form.name.trim()) {
    toast.add({
      title: 'Name is required',
      color: 'warning'
    })
    return
  }

  if (!activeBuilding.value?.id) {
    toast.add({
      title: 'Select a building first',
      color: 'warning'
    })
    return
  }

  creating.value = true

  try {
    const created = await $fetch<CreatedObject>('/api/objects', {
      method: 'POST',
      body: {
        buildingId: activeBuilding.value.id,
        name: form.name,
        description: form.description,
        address: form.address,
        code: form.code
      }
    })

    activeObject.value = {
      id: created.id,
      name: created.name
    }

    toast.add({
      title: 'Object created',
      description: created.name,
      color: 'success'
    })

    router.push('/objects')
  } catch (error: unknown) {
    toast.add({
      title: 'Failed to create object',
      description: getErrorMessage(error) || 'Check the form values and try again.',
      color: 'error'
    })
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="object-create">
    <template #header>
      <UDashboardNavbar title="Create Object">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            icon="i-lucide-arrow-left"
            variant="ghost"
            @click="router.push('/objects')"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="max-w-2xl">
        <UCard :ui="{ body: 'space-y-4' }">
          <UFormField label="Building">
            <UInput
              :model-value="activeBuilding?.name || 'No building selected'"
              class="w-full"
              disabled
            />
          </UFormField>

          <UFormField label="Name" required>
            <UInput
              v-model="form.name"
              class="w-full"
              placeholder="Main Entrance"
              autofocus
            />
          </UFormField>

          <UFormField label="Address">
            <UInput
              v-model="form.address"
              class="w-full"
              placeholder="City, district, street"
            />
          </UFormField>

          <UFormField label="Description">
            <UTextarea
              v-model="form.description"
              class="w-full"
              :rows="4"
              placeholder="Short object description"
            />
          </UFormField>

          <UFormField label="Code">
            <UInput
              v-model="form.code"
              class="w-full"
              placeholder="main-entrance"
            />
          </UFormField>

          <div class="flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="subtle"
              :disabled="creating"
              @click="router.push('/objects')"
            />
            <UButton
              label="Create"
              :loading="creating"
              @click="createObject"
            />
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
