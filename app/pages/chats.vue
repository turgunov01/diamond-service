<script setup lang="ts">
interface ChatItem {
  id: number
  title: string
  isGroup: boolean
  updatedAt: string
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

type ActiveObject = {
  id: number
  name: string
}

const toast = useToast()
const activeObject = useState<ActiveObject | null>('active-object', () => null)

const search = ref('')
const selectedChatId = ref<number | null>(null)
const messageText = ref('')
const newChatOpen = ref(false)
const newChatTitle = ref('')
const creatingChat = ref(false)
const sendingMessage = ref(false)

const objectId = computed(() => activeObject.value?.id ?? null)

const {
  data: chatList,
  error: chatListError,
  status: chatListStatus,
  refresh: refreshChats
} = await useAsyncData<ChatItem[]>(
  'chats-list',
  () => {
    if (!objectId.value) {
      return Promise.resolve([])
    }

    return $fetch('/api/chats', {
      query: {
        objectId: objectId.value
      }
    })
  },
  {
    default: () => [],
    watch: [objectId]
  }
)

const {
  data: selectedConversation,
  status: chatDetailStatus,
  refresh: refreshConversation
} = await useAsyncData<ChatDetail | null>(
  'chat-detail',
  () => {
    if (!objectId.value || !selectedChatId.value) {
      return Promise.resolve(null)
    }

    return $fetch(`/api/chats/${selectedChatId.value}`, {
      query: {
        objectId: objectId.value
      }
    })
  },
  {
    default: () => null,
    watch: [objectId, selectedChatId]
  }
)

watch(chatListError, (value) => {
  if (!value || !objectId.value) {
    return
  }

  toast.add({
    title: 'Не удалось загрузить чаты',
    description: value.statusMessage || 'Проверьте Telegram интеграцию и API чатов.',
    color: 'error'
  })
}, { immediate: true })

watch(chatList, (list) => {
  if (!list.length) {
    selectedChatId.value = null
    return
  }

  if (selectedChatId.value && list.some(chat => chat.id === selectedChatId.value)) {
    return
  }

  selectedChatId.value = list[0]?.id ?? null
}, { immediate: true })

watch(objectId, () => {
  messageText.value = ''
  newChatOpen.value = false
})

const filteredChats = computed(() => {
  const normalizedSearch = search.value.toLowerCase().trim()

  if (!normalizedSearch) {
    return chatList.value
  }

  return chatList.value.filter(chat =>
    chat.title.toLowerCase().includes(normalizedSearch)
  )
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

async function sendMessage() {
  if (!selectedConversation.value || !objectId.value || sendingMessage.value) {
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
        objectId: objectId.value
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
  if (!objectId.value || creatingChat.value) {
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
        objectId: objectId.value
      }
    })

    newChatTitle.value = ''
    newChatOpen.value = false
    await refreshChats()
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
              v-if="activeObject"
              :label="activeObject.name"
              color="neutral"
              variant="subtle"
            />
            <UButton
              icon="i-lucide-plus"
              label="Новый чат"
              :disabled="!activeObject"
              @click="newChatOpen = true"
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <UAlert
          v-if="!activeObject"
          color="warning"
          variant="subtle"
          title="Объект не выбран"
          description="Выберите объект в верхнем меню, чтобы видеть только его чаты."
        />

        <div class="grid gap-4 lg:grid-cols-[340px_1fr] h-[calc(100vh-160px)]">
          <div class="rounded-xl border border-default bg-elevated/50 flex flex-col overflow-hidden">
            <div class="p-3 space-y-3">
              <UInput
                v-model="search"
                icon="i-lucide-search"
                placeholder="Поиск"
                size="sm"
              />

              <p class="text-xs text-muted">
                Всего чатов: {{ chatList.length }}
              </p>
            </div>

            <div class="divide-y divide-default overflow-y-auto">
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
                Чатов для выбранного объекта пока нет.
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
              <div class="min-w-0">
                <p class="font-semibold truncate">
                  {{ selectedConversation?.title || 'Выберите чат' }}
                </p>
                <p class="text-xs text-muted">
                  {{ selectedConversation?.isGroup ? 'Групповой чат' : 'Личный чат' }}
                </p>
              </div>
            </div>

            <div class="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[radial-gradient(circle_at_10%_20%,rgba(255,255,255,0.05),transparent_25%),radial-gradient(circle_at_90%_10%,rgba(255,255,255,0.05),transparent_20%)]">
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
                v-if="!selectedConversation?.messages.length && chatDetailStatus !== 'pending'"
                class="text-sm text-muted"
              >
                Сообщений пока нет.
              </div>
            </div>

            <div class="px-4 py-3 border-t border-default bg-elevated/60">
              <div class="flex items-center gap-2">
                <UInput
                  v-model="messageText"
                  placeholder="Написать сообщение"
                  class="flex-1"
                  :disabled="!selectedConversation"
                  @keyup.enter="sendMessage"
                />
                <UButton
                  icon="i-lucide-send"
                  label="Отправить"
                  :disabled="!selectedConversation"
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
                :loading="creatingChat"
                @click="createChat"
              />
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
