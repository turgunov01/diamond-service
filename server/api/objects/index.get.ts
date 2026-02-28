import { getSupabaseServerConfig, getSupabaseServerHeaders } from '../../utils/supabase'

type ObjectRow = {
  id: number
  name: string
  description?: string | null
}

export default eventHandler(async () => {
  const { url, serviceRoleKey } = getSupabaseServerConfig()
  const rows = await $fetch<ObjectRow[]>(`${url}/rest/v1/objects`, {
    headers: getSupabaseServerHeaders(serviceRoleKey),
    query: {
      select: 'id,name,description',
      order: 'id.asc'
    }
  })
  return rows
})
