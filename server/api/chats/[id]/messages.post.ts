import { getSupabaseServerConfig, getSupabaseServerHeaders } from '../../../utils/supabase'
import { sendTelegramMessage } from '../../../utils/telegram'

interface Body {
  authorId: string
  content: string
  objectId?: number
}

interface ChatRow {
  id: number
  tg_chat_id?: number | null
}

interface TelegramSendResponse {
  result?: {
    message_id?: number
  }
  message_id?: number
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
  const [chat] = await $fetch<ChatRow[]>(`${url}/rest/v1/chats`, {
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

  const insertedRows = await $fetch<Array<{ id: number }>>(`${url}/rest/v1/chat_messages`, {
    method: 'POST',
    headers: {
      ...headers,
      Prefer: 'return=representation'
    },
    body: {
      chat_id: chatId,
      author_id: body.authorId,
      content: body.content,
      object_id: body.objectId,
      direction: 'out',
      status: 'sent'
    }
  })

  const inserted = insertedRows[0]
  if (!inserted?.id) {
    throw createError({ statusCode: 500, statusMessage: 'Supabase did not return created message id' })
  }

  await $fetch(`${url}/rest/v1/chats`, {
    method: 'PATCH',
    headers,
    query: { id: `eq.${chatId}` },
    body: {
      updated_at: new Date().toISOString()
    }
  })

  if (chat.tg_chat_id) {
    try {
      const sent = await sendTelegramMessage(chat.tg_chat_id, body.content) as TelegramSendResponse
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
    } catch {
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
