<script setup lang="ts">
interface Customer {
  id: number
  username: string
  phoneNumber: string
}

interface DocumentTemplate {
  id: number
  name: string
  description?: string
  contractType: string
  createdAt: string
  updatedAt: string
}

type DispatchStatus = 'sent' | 'partially_signed' | 'signed'

interface DocumentDispatch {
  id: number
  templateId: number | null
  templateName?: string
  title: string
  recipientIds: number[]
  recipientPhones: string[]
  recipientCount: number
  signedCount: number
  status: DispatchStatus
  sentAt: string
}

interface SignedDocument {
  id: number
  dispatchId: number | null
  templateId: number | null
  templateName?: string
  employeeName: string
  phoneNumber: string
  signedAt: string
  signedVia: string
  fileUrl?: string
}

interface DocumentsResponse {
  templates: DocumentTemplate[]
  sent: DocumentDispatch[]
  signed: SignedDocument[]
}

const toast = useToast()
const activeTab = ref<'templates' | 'sent' | 'signed'>('templates')
const sendModalOpen = ref(false)
const selectedTemplateId = ref<number | undefined>()
const selectedRecipientIds = ref<number[]>([])
const sending = ref(false)
const exporting = ref(false)

const tabs = [
  { label: 'Шаблоны', value: 'templates' },
  { label: 'Отправленные', value: 'sent' },
  { label: 'Подписанные', value: 'signed' }
]

const { data: documentsData, error, status, refresh } = await useFetch<DocumentsResponse>('/api/documents', {
  default: () => ({
    templates: [],
    sent: [],
    signed: []
  })
})

const { data: customers } = await useFetch<Customer[]>('/api/customers', {
  default: () => []
})

watch(error, (value) => {
  if (!value) {
    return
  }

  toast.add({
    title: 'Не удалось загрузить документы',
    description: value.statusMessage || 'Проверьте API документов и подключение к Supabase.',
    color: 'error'
  })
}, { immediate: true })

const templateSelectItems = computed(() => {
  return (documentsData.value?.templates || []).map(template => ({
    label: `${template.name} (${template.contractType.toUpperCase()})`,
    value: template.id
  }))
})

const customerSelectOptions = computed(() => {
  return (customers.value || []).map(customer => ({
    label: `@${customer.username} - ${customer.phoneNumber}`,
    value: customer.id
  }))
})

function formatDate(value: string) {
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function statusLabel(status: DispatchStatus) {
  if (status === 'sent') {
    return 'Отправлено'
  }

  if (status === 'partially_signed') {
    return 'Частично подписано'
  }

  return 'Подписано'
}

function statusColor(status: DispatchStatus) {
  if (status === 'sent') {
    return 'warning'
  }

  if (status === 'partially_signed') {
    return 'primary'
  }

  return 'success'
}

function openSendModal(templateId?: number) {
  selectedTemplateId.value = templateId
  selectedRecipientIds.value = []
  sendModalOpen.value = true
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    const err = error as { data?: { statusMessage?: string }, message?: string }
    return err.data?.statusMessage || err.message
  }

  return undefined
}

async function sendDocument() {
  if (sending.value) {
    return
  }

  if (!selectedTemplateId.value) {
    toast.add({
      title: 'Выберите шаблон',
      color: 'warning'
    })
    return
  }

  if (!selectedRecipientIds.value.length) {
    toast.add({
      title: 'Выберите сотрудников',
      color: 'warning'
    })
    return
  }

  sending.value = true

  try {
    await $fetch('/api/documents/send', {
      method: 'POST',
      body: {
        templateId: selectedTemplateId.value,
        recipientIds: selectedRecipientIds.value
      }
    })

    toast.add({
      title: 'Документ отправлен',
      description: `Сотрудников в отправке: ${selectedRecipientIds.value.length}`,
      color: 'success'
    })

    sendModalOpen.value = false
    await refresh()
  } catch (err: unknown) {
    toast.add({
      title: 'Не удалось отправить документ',
      description: getErrorMessage(err) || 'Повторите попытку.',
      color: 'error'
    })
  } finally {
    sending.value = false
  }
}

function createTemplate() {
  navigateTo('/documents/builder')
}

function editTemplate(templateId: number) {
  navigateTo(`/documents/builder?templateId=${templateId}`)
}

async function exportSigned(format: 'pdf' | 'xlsx' | 'csv') {
  if (exporting.value) {
    return
  }

  exporting.value = true

  try {
    const response = await fetch(`/api/documents/export?scope=signed&format=${format}`)
    if (!response.ok) {
      throw new Error('Export failed')
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `signed-documents.${format}`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch (err: unknown) {
    toast.add({
      title: 'Не удалось скачать файл',
      description: getErrorMessage(err) || 'Проверьте API экспорта.',
      color: 'error'
    })
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="documents">
    <template #header>
      <UDashboardNavbar title="Документы">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <UTabs
            v-model="activeTab"
            :items="tabs"
            :content="false"
            class="w-max"
            :ui="{ list: 'w-max' }"
          />

          <div class="flex flex-wrap items-center gap-2">
            <UButton
              v-if="activeTab === 'templates'"
              label="Создать шаблон"
              icon="i-lucide-file-plus"
              @click="createTemplate"
            />
            <UButton
              v-if="activeTab === 'sent'"
              label="Новая отправка"
              icon="i-lucide-send"
              @click="openSendModal()"
            />
            <template v-if="activeTab === 'signed'">
              <UButton
                label="PDF"
                icon="i-lucide-file-text"
                color="neutral"
                variant="outline"
                :loading="exporting"
                @click="exportSigned('pdf')"
              />
              <UButton
                label="Excel"
                icon="i-lucide-file-spreadsheet"
                color="neutral"
                variant="outline"
                :loading="exporting"
                @click="exportSigned('xlsx')"
              />
              <UButton
                label="CSV"
                icon="i-lucide-file"
                color="neutral"
                variant="outline"
                :loading="exporting"
                @click="exportSigned('csv')"
              />
            </template>
          </div>
        </div>

        <div v-if="activeTab === 'templates'" class="grid gap-3 md:grid-cols-2">
          <div
            v-for="template in documentsData.templates"
            :key="template.id"
            class="rounded-lg border border-default bg-elevated/30 p-4 space-y-3"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="font-semibold text-highlighted">
                  {{ template.name }}
                </p>
                <p class="text-sm text-muted">
                  {{ template.description || 'Без описания' }}
                </p>
              </div>
              <UBadge :label="template.contractType.toUpperCase()" color="neutral" variant="subtle" />
            </div>

            <p class="text-xs text-muted">
              Обновлен: {{ formatDate(template.updatedAt) }}
            </p>

            <div class="flex flex-wrap items-center gap-2">
              <UButton
                label="Редактор"
                size="sm"
                color="neutral"
                variant="outline"
                icon="i-lucide-pencil"
                @click="editTemplate(template.id)"
              />
              <UButton
                label="Отправить"
                size="sm"
                icon="i-lucide-send"
                @click="openSendModal(template.id)"
              />
            </div>
          </div>

          <div
            v-if="!documentsData.templates.length"
            class="rounded-lg border border-dashed border-default p-6 text-center text-sm text-muted md:col-span-2"
          >
            Шаблонов пока нет. Создайте первый шаблон через GrapesJS редактор.
          </div>
        </div>

        <div v-else-if="activeTab === 'sent'" class="rounded-lg border border-default overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="bg-elevated/50">
                <th class="px-3 py-2 text-left">ID</th>
                <th class="px-3 py-2 text-left">Заголовок</th>
                <th class="px-3 py-2 text-left">Шаблон</th>
                <th class="px-3 py-2 text-left">Получатели</th>
                <th class="px-3 py-2 text-left">Подписано</th>
                <th class="px-3 py-2 text-left">Статус</th>
                <th class="px-3 py-2 text-left">Дата</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="dispatch in documentsData.sent"
                :key="dispatch.id"
                class="border-t border-default"
              >
                <td class="px-3 py-2">{{ dispatch.id }}</td>
                <td class="px-3 py-2">{{ dispatch.title }}</td>
                <td class="px-3 py-2">{{ dispatch.templateName || '-' }}</td>
                <td class="px-3 py-2">{{ dispatch.recipientCount }}</td>
                <td class="px-3 py-2">{{ dispatch.signedCount }}</td>
                <td class="px-3 py-2">
                  <UBadge
                    :label="statusLabel(dispatch.status)"
                    :color="statusColor(dispatch.status)"
                    variant="subtle"
                  />
                </td>
                <td class="px-3 py-2">{{ formatDate(dispatch.sentAt) }}</td>
              </tr>
              <tr v-if="!documentsData.sent.length">
                <td class="px-3 py-4 text-muted" colspan="7">
                  Отправленных документов пока нет.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="rounded-lg border border-default overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="bg-elevated/50">
                <th class="px-3 py-2 text-left">ID</th>
                <th class="px-3 py-2 text-left">Сотрудник</th>
                <th class="px-3 py-2 text-left">Телефон</th>
                <th class="px-3 py-2 text-left">Шаблон</th>
                <th class="px-3 py-2 text-left">Подписано через</th>
                <th class="px-3 py-2 text-left">Дата подписи</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in documentsData.signed"
                :key="item.id"
                class="border-t border-default"
              >
                <td class="px-3 py-2">{{ item.id }}</td>
                <td class="px-3 py-2">{{ item.employeeName }}</td>
                <td class="px-3 py-2">{{ item.phoneNumber }}</td>
                <td class="px-3 py-2">{{ item.templateName || '-' }}</td>
                <td class="px-3 py-2">{{ item.signedVia }}</td>
                <td class="px-3 py-2">{{ formatDate(item.signedAt) }}</td>
              </tr>
              <tr v-if="!documentsData.signed.length">
                <td class="px-3 py-4 text-muted" colspan="6">
                  Подписанных документов пока нет.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-if="status === 'pending'" class="text-sm text-muted">
          Загрузка документов...
        </p>
      </div>

      <UModal
        v-model:open="sendModalOpen"
        title="Отправка документа"
        description="Выберите шаблон и сотрудников, которые подпишут документ в мобильном приложении"
      >
        <template #body>
          <div class="space-y-4">
            <UFormField label="Шаблон">
              <USelect
                v-model="selectedTemplateId"
                :items="templateSelectItems"
                class="w-full"
                placeholder="Выберите шаблон"
              />
            </UFormField>

            <UFormField label="Сотрудники">
              <USelectMenu
                v-model="selectedRecipientIds"
                :options="customerSelectOptions"
                multiple
                searchable
                class="w-full"
                placeholder="Выберите сотрудников"
              />
            </UFormField>

            <div class="flex items-center justify-end gap-2">
              <UButton
                label="Отмена"
                color="neutral"
                variant="subtle"
                :disabled="sending"
                @click="sendModalOpen = false"
              />
              <UButton
                label="Отправить"
                icon="i-lucide-send"
                :loading="sending"
                @click="sendDocument"
              />
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>

