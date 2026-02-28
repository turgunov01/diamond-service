import { getSupabaseServerConfig, getSupabaseServerHeaders } from '../../../utils/supabase'

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

  const inserted = await $fetch<{ id: number }>(`${url}/rest/v1/chat_messages`, {
    method: 'POST',
    headers,
    body: {
      chat_id: chatId,
      author_id: body.authorId,
      content: body.content,
      object_id: body.objectId
    }
  })

  return inserted
})
