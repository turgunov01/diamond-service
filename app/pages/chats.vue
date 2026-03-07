<script setup lang="ts">
type ActiveObject = {
  id: number
  name: string
}

type ActiveBuilding = {
  id: number
  name: string
}

type ObjectItem = {
  id: number
  name: string
}

interface ChatItem {
  id: number
  title: string
  isGroup: boolean
  updatedAt: string
  objectId: number
  objectName?: string
  tgChatId?: number
  tgType?: string
  lastMessage?: string
  lastTime?: string
  unread?: number
}

interface ChatMessage {
  id: number
  authorId: string
  text: string
  createdAt: string
  direction: 'in' | 'out'
  status: 'sent' | 'delivered' | 'error'
}

interface ChatDetail {
  id: number
  title: string
  isGroup: boolean
  updatedAt: string
  messages: ChatMessage[]
}

interface TelegramBinding {
  id: number
  tgChatId: number
  objectId: number
  title?: string | null
  isActive: boolean
  updatedAt?: string | null
}

const toast = useToast()
const activeBuilding = useState<ActiveBuilding | null>('active-building', () => null)
const activeObject = useState<ActiveObject | null>('active-object', () => null)

const search = ref('')
const selectedChatId = ref<number | null>(null)
const selectedObjectFilter = ref<number | 'all'>('all')
const messageText = ref('')
const newChatOpen = ref(false)
const newChatTitle = ref('')
const creatingChat = ref(false)
const sendingMessage = ref(false)
const telegramModalOpen = ref(false)
const savingBinding = ref(false)
const bindingLoading = ref(false)
const telegramBindings = ref<TelegramBinding[]>([])
const bindingForm = reactive({
  tgChatId: '',
  title: '',
  isActive: true
})

const buildingId = computed(() => activeBuilding.value?.id ?? null)

if (activeObject.value?.id) {
  selectedObjectFilter.value = activeObject.value.id
}

const {
  data: objects,
  status: objectsStatus
} = await useAsyncData<ObjectItem[]>(
  'chat-objects',
  () => {
    if (!buildingId.value) {
      return Promise.resolve([])
    }

    return $fetch('/api/objects', {
      query: {
        buildingId: buildingId.value
      }
    })
  },
  {
    default: () => [],
    watch: [buildingId]
  }
)

const isObjectsLoading = computed(() => objectsStatus.value === 'pending')

const {
  data: chatList,
  error: chatListError,
  status: chatListStatus,
  refresh: refreshChats
} = await useAsyncData<ChatItem[]>(
  'chats-list',
  () => {
    if (!buildingId.value) {
      return Promise.resolve([])
    }

    return $fetch('/api/chats', {
      query: {
        buildingId: buildingId.value
      }
    })
  },
  {
    default: () => [],
    watch: [buildingId]
  }
)

const isChatListLoading = computed(() => chatListStatus.value === 'pending')

watch(chatListError, (value) => {
  if (!value || !buildingId.value) {
    return
  }

  toast.add({
    title: 'Не удалось загрузить чаты',
    description: value.statusMessage || 'Проверьте интеграцию Telegram и API чатов.',
    color: 'error'
  })
}, { immediate: true })

watch(objects, (list) => {
  if (!list?.length) {
    selectedObjectFilter.value = 'all'
    return
  }

  if (selectedObjectFilter.value !== 'all' && !list.some(obj => obj.id === selectedObjectFilter.value)) {
    selectedObjectFilter.value = 'all'
  }
}, { immediate: true })

watch(buildingId, () => {
  selectedChatId.value = null
  messageText.value = ''
  newChatOpen.value = false
})

const chatCountByObject = computed(() => {
  const counts = new Map<number, number>()
  for (const chat of chatList.value) {
    counts.set(chat.objectId, (counts.get(chat.objectId) || 0) + 1)
  }
  return counts
})

const objectsWithCounts = computed(() => (objects.value || []).map(obj => ({
  ...obj,
  chatCount: chatCountByObject.value.get(obj.id) || 0
})))

const totalChats = computed(() => chatList.value.length)

const objectFilters = computed(() => [
  { label: 'All', value: 'all' as const, count: totalChats.value },
  ...objectsWithCounts.value.map(obj => ({
    label: obj.name,
    value: obj.id as number,
    count: obj.chatCount
  }))
])

const filteredChats = computed(() => {
  const normalizedSearch = search.value.toLowerCase().trim()

  return chatList.value
    .filter(chat => selectedObjectFilter.value === 'all' || chat.objectId === selectedObjectFilter.value)
    .filter(chat => {
      if (!normalizedSearch) {
        return true
      }

      const inTitle = chat.title.toLowerCase().includes(normalizedSearch)
      const inObject = chat.objectName?.toLowerCase().includes(normalizedSearch)
      return inTitle || inObject
    })
})

const selectedChatMeta = computed(() => chatList.value.find(chat => chat.id === selectedChatId.value) || null)
const selectedChatObjectId = computed(() => selectedChatMeta.value?.objectId ?? null)

const {
  data: selectedConversation,
  status: chatDetailStatus,
  refresh: refreshConversation
} = await useAsyncData<ChatDetail | null>(
  'chat-detail',
  () => {
    if (!selectedChatId.value || !selectedChatObjectId.value) {
      return Promise.resolve(null)
    }

    return $fetch(`/api/chats/${selectedChatId.value}`, {
      query: {
        objectId: selectedChatObjectId.value
      }
    })
  },
  {
    default: () => null,
    watch: [selectedChatId, selectedChatObjectId]
  }
)

const isChatDetailLoading = computed(() => chatDetailStatus.value === 'pending')

watch(filteredChats, (list) => {
  if (!list.length) {
    selectedChatId.value = null
    return
  }

  if (!selectedChatId.value || !list.some(chat => chat.id === selectedChatId.value)) {
    selectedChatId.value = list[0]?.id ?? null
  }
}, { immediate: true })

const selectedObjectName = computed(() => {
  if (selectedObjectFilter.value === 'all') {
    return 'Все объекты'
  }

  return objectsWithCounts.value.find(obj => obj.id === selectedObjectFilter.value)?.name || ''
})

const canCreateChat = computed(() => typeof selectedObjectFilter.value === 'number')
const bindingObjectId = computed(() => typeof selectedObjectFilter.value === 'number' ? selectedObjectFilter.value : null)

watch(telegramModalOpen, (open) => {
  if (open) {
    loadBindings()
    return
  }

  bindingForm.tgChatId = ''
  bindingForm.title = ''
  bindingForm.isActive = true
})

watch(bindingObjectId, (value) => {
  if (telegramModalOpen.value && value) {
    loadBindings()
  }

  if (!value) {
    telegramBindings.value = []
  }
})

function formatListTime(value?: string) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()

  return date.toLocaleString('ru-RU', sameDay
    ? { hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit' })
}

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getErrorMessage(fetchError: unknown) {
  if (fetchError && typeof fetchError === 'object') {
    const err = fetchError as { data?: { statusMessage?: string }, message?: string }
    return err.data?.statusMessage || err.message
  }

  return undefined
}

async function loadBindings() {
  if (!bindingObjectId.value) {
    telegramBindings.value = []
    return
  }

  bindingLoading.value = true

  try {
    telegramBindings.value = await $fetch<TelegramBinding[]>('/api/telegram/bindings', {
      query: {
        objectId: bindingObjectId.value
      }
    })
  } catch (err) {
    toast.add({
      title: 'Не удалось загрузить привязки Telegram',
      description: getErrorMessage(err) || 'Проверьте объект и токен бота.',
      color: 'error'
    })
  } finally {
    bindingLoading.value = false
  }
}

async function saveBinding() {
  if (!bindingObjectId.value) {
    toast.add({
      title: 'Выберите объект',
      description: 'Привязка Telegram доступна только для конкретного объекта.',
      color: 'warning'
    })
    return
  }

  const tgChatId = Number(bindingForm.tgChatId)
  if (!Number.isInteger(tgChatId) || tgChatId === 0) {
    toast.add({
      title: 'Введите корректный chat_id',
      description: 'Используйте числовой chat_id, например -1001234567890.',
      color: 'warning'
    })
    return
  }

  savingBinding.value = true

  try {
    await $fetch('/api/telegram/bindings', {
      method: 'POST',
      body: {
        tgChatId,
        objectId: bindingObjectId.value,
        title: bindingForm.title.trim() || null,
        isActive: bindingForm.isActive
      }
    })

    toast.add({
      title: 'Привязка сохранена',
      color: 'success'
    })

    bindingForm.tgChatId = ''
    await loadBindings()
  } catch (err) {
    toast.add({
      title: 'Не удалось сохранить привязку',
      description: getErrorMessage(err) || 'Проверьте chat_id и повторите.',
      color: 'error'
    })
  } finally {
    savingBinding.value = false
  }
}

async function sendMessage() {
  const targetObjectId = selectedChatObjectId.value

  if (!selectedConversation.value || !targetObjectId || sendingMessage.value) {
    return
  }

  const content = messageText.value.trim()
  if (!content) {
    return
  }

  sendingMessage.value = true

  try {
    await $fetch(`/api/chats/${selectedConversation.value.id}/messages`, {
      method: 'POST',
      body: {
        authorId: 'dashboard-user',
        content,
        objectId: targetObjectId
      }
    })

    messageText.value = ''
    await Promise.all([refreshChats(), refreshConversation()])
  } catch (fetchError: unknown) {
    toast.add({
      title: 'Не удалось отправить сообщение',
      description: getErrorMessage(fetchError) || 'Повторите попытку.',
      color: 'error'
    })
  } finally {
    sendingMessage.value = false
  }
}

async function createChat() {
  const targetObjectId = typeof selectedObjectFilter.value === 'number'
    ? selectedObjectFilter.value
    : null

  if (!targetObjectId) {
    toast.add({
      title: 'Выберите объект',
      description: 'Чат можно создать только внутри конкретного объекта.',
      color: 'warning'
    })
    return
  }

  if (creatingChat.value) {
    return
  }

  const title = newChatTitle.value.trim()
  if (!title) {
    toast.add({
      title: 'Введите название чата',
      color: 'warning'
    })
    return
  }

  creatingChat.value = true

  try {
    const created = await $fetch<{ id: number }>('/api/chats', {
      method: 'POST',
      body: {
        title,
        isGroup: true,
        objectId: targetObjectId
      }
    })

    newChatTitle.value = ''
    newChatOpen.value = false
    await refreshChats()
    selectedObjectFilter.value = targetObjectId
    selectedChatId.value = created.id
  } catch (fetchError: unknown) {
    toast.add({
      title: 'Не удалось создать чат',
      description: getErrorMessage(fetchError) || 'Повторите попытку.',
      color: 'error'
    })
  } finally {
    creatingChat.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="chats">
    <template #header>
      <UDashboardNavbar title="Чаты">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <div class="flex items-center gap-2">
            <UBadge
              v-if="activeBuilding"
              :label="activeBuilding.name"
              color="neutral"
              variant="subtle"
            />
            <UBadge
              :label="selectedObjectName"
              color="primary"
              variant="subtle"
            />
            <UButton
              icon="i-simple-icons-telegram"
              color="primary"
              variant="ghost"
              :disabled="selectedObjectFilter === 'all'"
              @click="telegramModalOpen = true"
            >
              Telegram
            </UButton>
            <UButton
              icon="i-lucide-plus"
              label="Новый чат"
              :disabled="!canCreateChat"
              @click="newChatOpen = true"
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <UAlert
          v-if="!buildingId"
          color="warning"
          variant="subtle"
          title="Здание не выбрано"
          description="Выберите здание в верхнем меню, чтобы увидеть чаты его объектов."
        />

        <UAlert
          v-else-if="objectsStatus !== 'pending' && !objects?.length"
          color="warning"
          variant="subtle"
          title="Нет объектов"
          description="Добавьте хотя бы один объект в выбранном здании, чтобы вести чаты."
        />

        <div class="grid gap-4 lg:grid-cols-[360px_1fr] h-[calc(100vh-160px)]">
          <div class="rounded-xl border border-default bg-elevated/50 flex flex-col overflow-hidden">
            <div class="p-3 space-y-3">
              <UInput
                v-model="search"
                icon="i-lucide-search"
                placeholder="Поиск"
                size="sm"
              />

              <div class="-mx-1 flex gap-2 overflow-x-auto pb-1 px-1">
                <template v-if="isObjectsLoading">
                  <div
                    v-for="n in 4"
                    :key="`obj-skeleton-${n}`"
                    class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-elevated/60 animate-pulse"
                  >
                    <div class="h-3 w-16 bg-default/60 rounded" />
                    <div class="h-5 w-6 bg-primary/40 rounded-full" />
                  </div>
                </template>
                <template v-else>
                  <button
                    v-for="filter in objectFilters"
                    :key="filter.value"
                    class="flex items-center gap-2 px-3 py-1.5 rounded-full transition whitespace-nowrap"
                    :class="selectedObjectFilter === filter.value
                      ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                      : 'bg-elevated/70 text-muted hover:text-highlighted'"
                    @click="selectedObjectFilter = filter.value"
                  >
                    <span class="text-sm font-medium">{{ filter.label }}</span>
                    <UBadge
                      v-if="filter.count"
                      :label="String(filter.count)"
                      color="primary"
                      variant="solid"
                    />
                  </button>
                </template>
              </div>

              <p class="text-xs text-muted">
                Всего чатов: {{ isChatListLoading ? '—' : totalChats }}
              </p>
            </div>

            <div v-if="isChatListLoading" class="divide-y divide-default overflow-y-auto">
              <div
                v-for="n in 8"
                :key="`chat-skeleton-${n}`"
                class="px-3 py-3 flex gap-3 animate-pulse"
              >
                <div class="h-10 w-10 rounded-full bg-default/70" />
                <div class="min-w-0 flex-1 space-y-2">
                  <div class="flex items-center justify-between gap-3">
                    <div class="h-4 w-3/4 bg-default/70 rounded" />
                    <div class="h-3 w-14 bg-default/60 rounded" />
                  </div>
                  <div class="h-3 w-1/2 bg-default/50 rounded" />
                  <div class="h-3 w-1/3 bg-default/40 rounded" />
                </div>
              </div>
            </div>

            <div v-else class="divide-y divide-default overflow-y-auto">
              <button
                v-for="chat in filteredChats"
                :key="chat.id"
                class="w-full text-left px-3 py-3 hover:bg-elevated/70 transition flex gap-3"
                :class="chat.id === selectedChatId ? 'bg-primary/10 ring-1 ring-primary/30' : ''"
                @click="selectedChatId = chat.id"
              >
                <UAvatar :alt="chat.title" :text="chat.title.slice(0, 1).toUpperCase()" size="md" />
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-3">
                    <p class="font-medium truncate">
                      {{ chat.title }}
                    </p>
                    <span class="text-xs text-muted">{{ formatListTime(chat.lastTime || chat.updatedAt) }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-[11px] text-muted mt-0.5">
                    <UBadge
                      :label="chat.objectName || `Объект #${chat.objectId}`"
                      color="neutral"
                      variant="subtle"
                    />
                  </div>
                  <p class="text-sm text-muted truncate">
                    {{ chat.lastMessage || 'Сообщений пока нет' }}
                  </p>
                </div>
                <UBadge
                  v-if="chat.unread"
                  :label="chat.unread"
                  color="primary"
                  variant="solid"
                  class="self-center"
                />
              </button>

              <div
                v-if="!filteredChats.length && chatListStatus !== 'pending'"
                class="px-4 py-6 text-sm text-muted"
              >
                Чатов для выбранного фильтра пока нет.
              </div>
            </div>
          </div>

          <div class="rounded-xl border border-default bg-elevated/30 flex flex-col overflow-hidden">
            <div class="px-4 py-3 flex items-center gap-3 border-b border-default">
              <UAvatar
                v-if="selectedConversation"
                :alt="selectedConversation.title"
                :text="selectedConversation.title.slice(0, 1).toUpperCase()"
                size="md"
              />
              <div class="min-w-0 flex-1">
                <p class="font-semibold truncate">
                  {{ selectedConversation?.title || 'Выберите чат' }}
                </p>
                <p class="text-xs text-muted flex items-center gap-2">
                  <span>
                    {{ selectedConversation?.isGroup ? 'Групповой чат' : 'Личный чат' }}
                  </span>
                  <UBadge
                    v-if="selectedChatMeta"
                    :label="selectedChatMeta.objectName || `Объект #${selectedChatMeta.objectId}`"
                    color="neutral"
                    variant="subtle"
                  />
                </p>
              </div>
            </div>

            <div class="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[radial-gradient(circle_at_10%_20%,rgba(255,255,255,0.05),transparent_25%),radial-gradient(circle_at_90%_10%,rgba(255,255,255,0.05),transparent_20%)]">
              <template v-if="isChatDetailLoading">
                <div
                  v-for="n in 6"
                  :key="`msg-skeleton-${n}`"
                  class="flex"
                  :class="n % 2 === 0 ? 'justify-end' : 'justify-start'"
                >
                  <div
                    class="max-w-[70%] rounded-2xl px-3 py-2 text-sm shadow-sm animate-pulse"
                    :class="n % 2 === 0
                      ? 'bg-primary/50 text-white rounded-br-none'
                      : 'bg-elevated text-highlighted rounded-bl-none border border-default/60'"
                  >
                    <div class="h-3 w-32 bg-default/60 rounded" />
                    <div class="h-3 w-24 bg-default/50 rounded mt-1" />
                  </div>
                </div>
              </template>
              <template v-else>
                <div
                  v-for="msg in selectedConversation?.messages || []"
                  :key="msg.id"
                  class="flex"
                  :class="msg.direction === 'out' ? 'justify-end' : 'justify-start'"
                >
                  <div
                    class="max-w-[70%] rounded-2xl px-3 py-2 text-sm shadow-sm"
                    :class="msg.direction === 'out'
                      ? 'bg-primary text-white rounded-br-none'
                      : 'bg-elevated text-highlighted rounded-bl-none border border-default/60'"
                  >
                    <p>{{ msg.text }}</p>
                    <span class="block text-[11px] opacity-70 mt-1 text-right">
                      {{ formatMessageTime(msg.createdAt) }}
                    </span>
                  </div>
                </div>

                <div
                  v-if="!selectedConversation?.messages.length"
                  class="text-sm text-muted"
                >
                  Сообщений пока нет.
                </div>
              </template>
            </div>

            <div class="px-4 py-3 border-t border-default bg-elevated/60">
              <div class="flex items-center gap-2">
                <UInput
                  v-model="messageText"
                  placeholder="Написать сообщение"
                  class="flex-1"
                  :disabled="!selectedConversation || isChatDetailLoading"
                  @keyup.enter="sendMessage"
                />
                <UButton
                  icon="i-lucide-send"
                  label="Отправить"
                  :disabled="!selectedConversation || isChatDetailLoading"
                  :loading="sendingMessage"
                  @click="sendMessage"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <UModal
        v-model:open="newChatOpen"
        title="Новый чат"
        description="Чат будет создан внутри выбранного объекта."
      >
        <template #body>
          <div class="space-y-4">
            <UFormField label="Название">
              <UInput
                v-model="newChatTitle"
                class="w-full"
                placeholder="Например, Смена охраны"
              />
            </UFormField>

            <div class="flex items-center justify-end gap-2">
              <UButton
                label="Отмена"
                color="neutral"
                variant="subtle"
                :disabled="creatingChat"
                @click="newChatOpen = false"
              />
              <UButton
                label="Создать"
                icon="i-lucide-plus"
                :disabled="!canCreateChat"
                :loading="creatingChat"
                @click="createChat"
              />
            </div>
          </div>
        </template>
      </UModal>

      <UModal
        v-model:open="telegramModalOpen"
        title="Привязка Telegram"
        description="Свяжите группу/канал Telegram с выбранным объектом, чтобы получать и отправлять сообщения из /chats."
      >
        <template #body>
          <div class="space-y-4">
            <UAlert
              v-if="selectedObjectFilter === 'all'"
              color="warning"
              variant="subtle"
              title="Выберите объект"
              description="Переключитесь на конкретный объект, затем добавьте chat_id Telegram."
            />

            <div class="grid gap-3 md:grid-cols-2">
              <UFormField label="Telegram chat_id" required>
                <UInput
                  v-model="bindingForm.tgChatId"
                  type="number"
                  placeholder="-1001234567890"
                  :disabled="selectedObjectFilter === 'all'"
                />
              </UFormField>

              <UFormField label="Название (опционально)">
                <UInput
                  v-model="bindingForm.title"
                  placeholder="Например: Группа охраны"
                  :disabled="selectedObjectFilter === 'all'"
                />
              </UFormField>

              <div class="flex items-center gap-2">
                <USwitch
                  v-model="bindingForm.isActive"
                  :disabled="selectedObjectFilter === 'all'"
                />
                <span class="text-sm text-muted">Активна</span>
              </div>
            </div>

            <div class="flex items-center justify-between text-xs text-muted">
              <span>Webhook: <code class="px-1 py-0.5 rounded bg-default/50">/api/telegram/webhook</code></span>
              <span>Заголовок: <code class="px-1 py-0.5 rounded bg-default/50">X-Telegram-Bot-Api-Secret-Token</code></span>
            </div>

            <div class="flex items-center justify-end gap-2">
              <UButton
                label="Сохранить привязку"
                icon="i-lucide-link"
                :loading="savingBinding"
                :disabled="selectedObjectFilter === 'all'"
                @click="saveBinding"
              />
            </div>

            <div class="space-y-2">
              <p class="text-xs text-muted">Привязанные чаты</p>

              <div v-if="bindingLoading" class="space-y-2">
                <div
                  v-for="n in 3"
                  :key="`binding-skeleton-${n}`"
                  class="h-12 rounded-lg border border-dashed border-default bg-default/40 animate-pulse"
                />
              </div>

              <div v-else-if="!telegramBindings.length" class="text-sm text-muted">
                Пока нет сохраненных привязок для этого объекта.
              </div>

              <div v-else class="space-y-2">
                <div
                  v-for="binding in telegramBindings"
                  :key="binding.id"
                  class="flex items-center justify-between rounded-lg border border-default bg-elevated/40 px-3 py-2"
                >
                  <div class="min-w-0">
                    <p class="font-medium truncate">
                      chat_id: {{ binding.tgChatId }}
                    </p>
                    <p class="text-xs text-muted truncate">
                      {{ binding.title || 'Без названия' }}
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <UBadge
                      :label="binding.isActive ? 'Активен' : 'Выключен'"
                      :color="binding.isActive ? 'primary' : 'neutral'"
                      variant="subtle"
                    />
                    <span class="text-[11px] text-muted">
                      {{ binding.updatedAt ? formatListTime(binding.updatedAt) : '' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
