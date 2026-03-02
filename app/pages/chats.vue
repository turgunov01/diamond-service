<script setup lang="ts">
type Message = {
  id: number
  author: 'me' | 'them'
  text: string
  time: string
}

type Conversation = {
  id: number
  title: string
  lastMessage: string
  unread: number
  online: boolean
  time: string
  messages: Message[]
}

const conversations = ref<Conversation[]>([
  {
    id: 1,
    title: 'Команда проекта',
    lastMessage: 'Отправил новый макет, посмотри',
    unread: 2,
    online: true,
    time: '14:05',
    messages: [
      { id: 1, author: 'them', text: 'Привет! Видел обновление?', time: '13:57' },
      { id: 2, author: 'me', text: 'Да, сейчас гляну и отпишусь.', time: '13:59' },
      { id: 3, author: 'them', text: 'Отправил новый макет, посмотри', time: '14:05' }
    ]
  },
  {
    id: 2,
    title: 'Финансы',
    lastMessage: 'Закроем платеж сегодня',
    unread: 0,
    online: false,
    time: '12:18',
    messages: [
      { id: 1, author: 'them', text: 'Нужно подтвердить оплату до 18:00', time: '12:10' },
      { id: 2, author: 'me', text: 'Ок, подготовлю.', time: '12:15' },
      { id: 3, author: 'them', text: 'Закроем платеж сегодня', time: '12:18' }
    ]
  }
])

const selectedId = ref<number>(conversations.value[0]?.id || 1)

const selectedConversation = computed(() => {
  return conversations.value.find(c => c.id === selectedId.value)
})

const search = ref('')

const filtered = computed(() =>
  conversations.value.filter(c =>
    c.title.toLowerCase().includes(search.value.toLowerCase().trim())
  )
)
</script>

<template>
  <UDashboardPanel id="chats">
    <template #header>
      <UDashboardNavbar title="Чаты">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton icon="i-lucide-plus" label="Новый чат" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="grid gap-4 lg:grid-cols-[340px_1fr] h-[calc(100vh-160px)]">
        <!-- Sidebar -->
        <div class="rounded-xl border border-default bg-elevated/50 flex flex-col overflow-hidden">
          <div class="p-3">
            <UInput
              v-model="search"
              icon="i-lucide-search"
              placeholder="Поиск"
              size="sm"
            />
          </div>

          <div class="divide-y divide-default overflow-y-auto">
            <button
              v-for="chat in filtered"
              :key="chat.id"
              class="w-full text-left px-3 py-3 hover:bg-elevated/70 transition flex gap-3"
              :class="chat.id === selectedId ? 'bg-primary/10 ring-1 ring-primary/30' : ''"
              @click="selectedId = chat.id"
            >
              <div class="relative shrink-0">
                <UAvatar :alt="chat.title" :ui="{ rounded: 'rounded-full' }" size="md">
                  {{ chat.title.slice(0, 1).toUpperCase() }}
                </UAvatar>
                <span
                  v-if="chat.online"
                  class="absolute right-0 bottom-0 size-2.5 rounded-full bg-success ring-2 ring-elevated"
                />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between">
                  <p class="font-medium truncate">{{ chat.title }}</p>
                  <span class="text-xs text-muted">{{ chat.time }}</span>
                </div>
                <p class="text-sm text-muted truncate">{{ chat.lastMessage }}</p>
              </div>
              <UBadge
                v-if="chat.unread"
                :label="chat.unread"
                color="primary"
                variant="solid"
                class="self-center"
              />
            </button>
          </div>
        </div>

        <!-- Chat area -->
        <div class="rounded-xl border border-default bg-elevated/30 flex flex-col overflow-hidden">
          <div class="px-4 py-3 flex items-center gap-3 border-b border-default">
            <UAvatar
              v-if="selectedConversation"
              :alt="selectedConversation.title"
              :ui="{ rounded: 'rounded-full' }"
              size="md"
            >
              {{ selectedConversation.title.slice(0, 1).toUpperCase() }}
            </UAvatar>
            <div class="min-w-0">
              <p class="font-semibold truncate">
                {{ selectedConversation?.title || 'Выберите чат' }}
              </p>
              <p class="text-xs text-muted">
                {{ selectedConversation?.online ? 'в сети' : 'был(а) недавно' }}
              </p>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[radial-gradient(circle_at_10%_20%,rgba(255,255,255,0.05),transparent_25%),radial-gradient(circle_at_90%_10%,rgba(255,255,255,0.05),transparent_20%)]">
            <div
              v-for="msg in selectedConversation?.messages || []"
              :key="msg.id"
              class="flex"
              :class="msg.author === 'me' ? 'justify-end' : 'justify-start'"
            >
              <div
                class="max-w-[70%] rounded-2xl px-3 py-2 text-sm shadow-sm"
                :class="msg.author === 'me'
                  ? 'bg-primary text-white rounded-br-none'
                  : 'bg-elevated text-highlighted rounded-bl-none border border-default/60'"
              >
                <p>{{ msg.text }}</p>
                <span class="block text-[11px] opacity-70 mt-1 text-right">{{ msg.time }}</span>
              </div>
            </div>
          </div>

          <div class="px-4 py-3 border-t border-default bg-elevated/60">
            <div class="flex items-center gap-2">
              <UButton icon="i-lucide-paperclip" color="neutral" variant="ghost" square />
              <UInput placeholder="Написать сообщение" class="flex-1" />
              <UButton icon="i-lucide-send" label="Отправить" />
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
