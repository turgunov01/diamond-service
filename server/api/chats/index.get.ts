import { getSupabaseServerConfig, getSupabaseServerHeaders } from '../../utils/supabase'

type ChatRow = {
  id: number
  title: string
  is_group: boolean
  updated_at: string
  tg_chat_id?: number | null
  tg_type?: string | null
  last_message?: string | null
  last_time?: string | null
  unread?: number | null
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

export default eventHandler(async (event): Promise<ChatItem[]> => {
  const { url, serviceRoleKey } = getSupabaseServerConfig()

  const objectIdRaw = getQuery(event).objectId
  const objectId = objectIdRaw ? Number(objectIdRaw) : NaN
  if (!Number.isInteger(objectId) || objectId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'objectId query param is required' })
  }

  // For demo: last_message/last_time are fetched from latest chat_messages
  const rows = await $fetch<ChatRow[]>(`${url}/rest/v1/chats`, {
    headers: getSupabaseServerHeaders(serviceRoleKey),
    query: {
      select: `
        id,
        title,
        is_group,
        tg_chat_id,
        tg_type,
        updated_at,
        chat_messages!left(content, created_at),
        chat_messages(count)
      `,
      object_id: `eq.${objectId}`,
      order: 'updated_at.desc',
      limit: 50
    }
  })

  return rows.map(row => ({
    id: row.id,
    title: row.title,
    isGroup: row.is_group,
    updatedAt: row.updated_at,
    tgChatId: row.tg_chat_id || undefined,
    tgType: row.tg_type || undefined,
    lastMessage: (row as any).chat_messages?.[0]?.content || undefined,
    lastTime: (row as any).chat_messages?.[0]?.created_at || undefined,
    unread: undefined
  }))
})
