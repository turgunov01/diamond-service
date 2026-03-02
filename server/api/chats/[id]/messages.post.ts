import { getSupabaseServerConfig, getSupabaseServerHeaders } from '../../../utils/supabase'
import { sendTelegramMessage } from '../../../utils/telegram'

interface Body {
  authorId: string
  content: string
  objectId?: number
}

export default eventHandler(async (event) => {
  const chatId = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(chatId) || chatId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid chat id' })
  }

  const body = await readBody<Body>(event)
  if (!body?.authorId || !body?.content) {
    throw createError({ statusCode: 400, statusMessage: 'authorId and content are required' })
  }
  if (!body.objectId || body.objectId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'objectId is required' })
  }

  const { url, serviceRoleKey } = getSupabaseServerConfig()
  const headers = getSupabaseServerHeaders(serviceRoleKey)

  // Load chat to check Telegram mapping and object ownership
  const [chat] = await $fetch<any[]>(`${url}/rest/v1/chats`, {
    headers,
    query: {
      select: '*',
      id: `eq.${chatId}`,
      object_id: `eq.${body.objectId}`,
      limit: 1
    }
  })

  if (!chat) {
    throw createError({ statusCode: 404, statusMessage: 'Chat not found for this object' })
  }

  const inserted = await $fetch<{ id: number }>(`${url}/rest/v1/chat_messages`, {
    method: 'POST',
    headers,
    body: {
      chat_id: chatId,
      author_id: body.authorId,
      content: body.content,
      object_id: body.objectId,
      direction: 'out',
      status: 'sent'
    }
  })

  if (chat.tg_chat_id) {
    try {
      const sent = await sendTelegramMessage(chat.tg_chat_id, body.content) as any
      const externalId = sent?.result?.message_id || sent?.message_id

      await $fetch(`${url}/rest/v1/chat_messages`, {
        method: 'PATCH',
        headers,
        query: { id: `eq.${inserted.id}` },
        body: {
          status: 'delivered',
          external_id: externalId ?? null
        }
      })
    } catch (err) {
      await $fetch(`${url}/rest/v1/chat_messages`, {
        method: 'PATCH',
        headers,
        query: { id: `eq.${inserted.id}` },
        body: { status: 'error' }
      })
      throw createError({ statusCode: 502, statusMessage: 'Failed to send to Telegram' })
    }
  }

  return inserted
})
