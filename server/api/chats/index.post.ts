import { getSupabaseServerConfig, getSupabaseServerHeaders } from '../../utils/supabase'

interface Body {
  title: string
  isGroup?: boolean
  memberIds?: string[] // uuid[]
  objectId?: number
}

export default eventHandler(async (event) => {
  const body = await readBody<Body>(event)
  if (!body?.title) {
    throw createError({ statusCode: 400, statusMessage: 'title is required' })
  }
  if (!body.objectId || body.objectId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'objectId is required' })
  }

  const { url, serviceRoleKey } = getSupabaseServerConfig()
  const headers = getSupabaseServerHeaders(serviceRoleKey)

  const chat = await $fetch<{ id: number }>(`${url}/rest/v1/chats`, {
    method: 'POST',
    headers,
    body: {
      title: body.title,
      is_group: body.isGroup ?? true,
      object_id: body.objectId
    }
  })

  if (body.memberIds?.length) {
    await $fetch(`${url}/rest/v1/chat_members`, {
      method: 'POST',
      headers,
      body: body.memberIds.map(id => ({
        chat_id: chat.id,
        user_id: id,
        object_id: body.objectId
      }))
    })
  }

  return chat
})
