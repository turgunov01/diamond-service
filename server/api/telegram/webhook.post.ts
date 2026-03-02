import { getSupabaseServerConfig, getSupabaseServerHeaders } from '../../utils/supabase'
import { getDefaultObjectId, verifyTelegramSecret } from '../../utils/telegram'

type TgUser = { id: number, first_name?: string, last_name?: string, username?: string }
type TgChat = { id: number, type: string, title?: string, first_name?: string, last_name?: string, username?: string }
type TgMessage = { message_id: number, from?: TgUser, chat: TgChat, text?: string, date: number }
type TgUpdate = { update_id: number, message?: TgMessage }

export default eventHandler(async (event) => {
  if (!verifyTelegramSecret(event)) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid webhook secret' })
  }

  const update = await readBody<TgUpdate>(event)
  if (!update?.message?.chat) {
    return { ok: true }
  }

  const msg = update.message
  const chat = msg.chat
  const text = msg.text
  if (!text) {
    return { ok: true } // ignore non-text for now
  }

  const { url, serviceRoleKey } = getSupabaseServerConfig()
  const headers = getSupabaseServerHeaders(serviceRoleKey)

  // ensure chat exists
  const existingChats = await $fetch<any[]>(`${url}/rest/v1/chats`, {
    headers,
    query: {
      select: '*',
      tg_chat_id: `eq.${chat.id}`,
      limit: 1
    }
  })

  const objectId = getDefaultObjectId()
  let chatId: number

  if (existingChats.length) {
    chatId = existingChats[0].id
  } else {
    const title = chat.title || chat.username || chat.first_name || 'Telegram chat'
    const inserted = await $fetch<any[]>(`${url}/rest/v1/chats`, {
      method: 'POST',
      headers: {
        ...headers,
        Prefer: 'return=representation'
      },
      body: {
        title,
        is_group: chat.type !== 'private',
        tg_chat_id: chat.id,
        tg_type: chat.type,
        object_id: objectId
      }
    })
    chatId = inserted[0]?.id
    if (!chatId) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to upsert chat for Telegram' })
    }
  }

  await $fetch(`${url}/rest/v1/chat_messages`, {
    method: 'POST',
    headers,
    body: {
      chat_id: chatId,
      author_id: String(msg.from?.id || 'unknown'),
      content: text,
      external_id: msg.message_id,
      direction: 'in',
      status: 'delivered',
      object_id: objectId
    }
  })

  return { ok: true }
})
