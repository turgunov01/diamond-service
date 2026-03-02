import { getSupabaseServerConfig, getSupabaseServerHeaders } from '../../utils/supabase'

type ChatRow = {
  id: number
  title: string
  is_group: boolean
  updated_at: string
  tg_chat_id?: number | null
  tg_type?: string | null
}

type ChatMessageRow = {
  chat_id: number
  content: string
  created_at: string
}

type ChatItem = {
  id: number
  title: string
  isGroup: boolean
  updatedAt: string
  tgChatId?: number
  tgType?: string
  lastMessage?: string
  lastTime?: string
  unread?: number
}

function encodePostgrestIn(values: number[]) {
  return `(${values.join(',')})`
}

export default eventHandler(async (event): Promise<ChatItem[]> => {
  const { url, serviceRoleKey } = getSupabaseServerConfig()

  const objectIdRaw = getQuery(event).objectId
  const objectId = objectIdRaw ? Number(objectIdRaw) : NaN
  if (!Number.isInteger(objectId) || objectId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'objectId query param is required' })
  }

  const headers = getSupabaseServerHeaders(serviceRoleKey)
  const rows = await $fetch<ChatRow[]>(`${url}/rest/v1/chats`, {
    headers,
    query: {
      select: 'id,title,is_group,tg_chat_id,tg_type,updated_at',
      object_id: `eq.${objectId}`,
      order: 'updated_at.desc',
      limit: 50
    }
  })

  if (!rows.length) {
    return []
  }

  const messageRows = await $fetch<ChatMessageRow[]>(`${url}/rest/v1/chat_messages`, {
    headers,
    query: {
      select: 'chat_id,content,created_at',
      object_id: `eq.${objectId}`,
      chat_id: `in.${encodePostgrestIn(rows.map(row => row.id))}`,
      order: 'created_at.desc'
    }
  }).catch(() => [] as ChatMessageRow[])

  const latestMessageByChatId = new Map<number, ChatMessageRow>()
  for (const row of messageRows) {
    if (!latestMessageByChatId.has(row.chat_id)) {
      latestMessageByChatId.set(row.chat_id, row)
    }
  }

  return rows.map((row) => {
    const latestMessage = latestMessageByChatId.get(row.id)

    return {
      id: row.id,
      title: row.title,
      isGroup: row.is_group,
      updatedAt: row.updated_at,
      tgChatId: row.tg_chat_id || undefined,
      tgType: row.tg_type || undefined,
      lastMessage: latestMessage?.content || undefined,
      lastTime: latestMessage?.created_at || undefined,
      unread: undefined
    }
  })
})
