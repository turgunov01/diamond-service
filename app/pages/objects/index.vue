<script setup lang="ts">
type ObjectItem = {
  id: number
  name: string
  description?: string | null
  address?: string | null
  code?: string | null
}

const toast = useToast()
const createOpen = ref(false)
const creating = ref(false)

const activeObject = useState<{ id: number, name: string } | null>('active-object')

const { data: objects, refresh } = await useFetch<ObjectItem[]>('/api/objects', {
  default: () => []
})

const form = reactive({
  name: '',
  description: '',
  address: '',
  code: ''
})

async function createObject() {
  if (creating.value) return
  creating.value = true
  try {
    await $fetch('/api/objects', {
      method: 'POST',
      body: {
        name: form.name,
        description: form.description,
        address: form.address,
        code: form.code
      }
    })
    createOpen.value = false
    form.name = ''
    form.description = ''
    form.address = ''
    form.code = ''
    await refresh()
  } catch (error: any) {
    toast.add({
      title: 'Не удалось создать объект',
      description: error?.data?.statusMessage || error?.message,
      color: 'error'
    })
  } finally {
    creating.value = false
  }
}

function selectObject(item: ObjectItem) {
  activeObject.value = { id: item.id, name: item.name }
  toast.add({ title: `Выбран объект: ${item.name}` })
}
</script>

<template>
  <UDashboardPanel id="objects">
    <template #header>
      <UDashboardNavbar title="Объекты">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            icon="i-lucide-plus"
            label="Создать объект"
            @click="createOpen = true"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <UCard
          v-for="item in objects"
          :key="item.id"
          :title="item.name"
          :description="item.address || item.description"
          :ui="{ body: 'space-y-2' }"
          class="hover:border-primary/40 transition cursor-pointer"
          @click="selectObject(item)"
        >
          <p class="text-xs text-muted">
            Код: {{ item.code || '—' }}
          </p>
          <UButton
            size="xs"
            variant="subtle"
            color="primary"
            label="Сделать текущим"
            @click.stop="selectObject(item)"
          />
        </UCard>
      </div>
    </template>
  </UDashboardPanel>

  <UModal v-model="createOpen" prevent-close>
    <UCard :ui="{ body: 'space-y-3' }">
      <template #header>
        <div class="flex items-center justify-between">
          <p class="text-lg font-semibold">Новый объект</p>
          <UButton icon="i-lucide-x" variant="ghost" color="neutral" @click="createOpen = false" />
        </div>
      </template>

      <UFormField label="Название" required>
        <UInput v-model="form.name" placeholder="Tashkent City Mall" />
      </UFormField>
      <UFormField label="Адрес">
        <UInput v-model="form.address" placeholder="г. Ташкент, ..." />
      </UFormField>
      <UFormField label="Описание">
        <UTextarea v-model="form.description" :rows="3" />
      </UFormField>
      <UFormField label="Код / slug">
        <UInput v-model="form.code" placeholder="tashkent-city" />
      </UFormField>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="createOpen = false">Отмена</UButton>
          <UButton :loading="creating" @click="createObject">Создать</UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>
