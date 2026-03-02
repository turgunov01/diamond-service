import { getSupabaseServerConfig, getSupabaseServerHeaders } from '../../utils/supabase'

type BuildingRow = {
  id: number
  name: string
  logo?: string | null
  description?: string | null
}

export default eventHandler(async () => {
  const { url, serviceRoleKey } = getSupabaseServerConfig()

  return await $fetch<BuildingRow[]>(`${url}/rest/v1/buildings`, {
    headers: getSupabaseServerHeaders(serviceRoleKey),
    query: {
      select: 'id,name,logo,description',
      order: 'id.asc'
    }
  })
})
