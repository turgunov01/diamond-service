import { getSupabaseServerConfig, getSupabaseServerHeaders } from '../../utils/supabase'
import { getSupabaseErrorData } from './documents'

export default eventHandler(async (event) => {
  const rawId = getRouterParam(event, 'id')
  const templateId = Number(rawId)

  if (!rawId || !Number.isInteger(templateId) || templateId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid template id.' })
  }

  const { url, serviceRoleKey } = getSupabaseServerConfig()
  const headers = {
    ...getSupabaseServerHeaders(serviceRoleKey),
    Prefer: 'return=representation'
  }

  try {
    const rows = await $fetch<any[]>(`${url}/rest/v1/document_templates`, {
      method: 'DELETE',
      headers,
      query: {
        id: `eq.${templateId}`
      }
    })

    const deleted = rows?.[0]
    if (!deleted) {
      throw createError({ statusCode: 404, statusMessage: 'Template not found.' })
    }

    return { success: true, id: templateId }
  } catch (error: unknown) {
    const data = getSupabaseErrorData(error)
    if (data?.code === '42P01') {
      throw createError({
        statusCode: 500,
        statusMessage: 'Table "document_templates" is missing. Run db/supabase/documents.sql first.'
      })
    }
    throw error
  }
})
