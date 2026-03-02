import { getSupabaseServerConfig, getSupabaseServerHeaders } from '../../utils/supabase'

interface Body {
  name: string
  description?: string
  address?: string
  code?: string
}

export default eventHandler(async (event) => {
  const body = await readBody<Body>(event)
  if (!body?.name?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'name is required' })
  }

  const { url, serviceRoleKey } = getSupabaseServerConfig()
  const headers = getSupabaseServerHeaders(serviceRoleKey)

  const [created] = await $fetch<any[]>(`${url}/rest/v1/objects`, {
    method: 'POST',
    headers: {
      ...headers,
      Prefer: 'return=representation'
    },
    body: {
      name: body.name.trim(),
      description: body.description?.trim() || null,
      address: body.address?.trim() || null,
      code: body.code?.trim() || null
    }
  })

  if (!created) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to create object' })
  }

  setResponseStatus(event, 201)
  return created
})
