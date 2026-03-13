import { getSupabaseServerConfig, getSupabaseServerHeaders } from '../../utils/supabase'

type ObjectRow = {
  id: number
  building_id?: number | null
  name: string
  description?: string | null
  address?: string | null
  code?: string | null
  is_active?: boolean
}

export default eventHandler(async (event) => {
  const { url, serviceRoleKey } = getSupabaseServerConfig()
  const buildingIdRaw = getQuery(event).buildingId
  const buildingId = typeof buildingIdRaw === 'string' ? Number(buildingIdRaw) : NaN

  const query: Record<string, string> = {
    select: 'id,building_id,name,description,address,code,is_active',
    order: 'id.asc'
  }

  if (Number.isInteger(buildingId) && buildingId > 0) {
    query.building_id = `eq.${buildingId}`
  }

  const rows = await $fetch<ObjectRow[]>(`${url}/rest/v1/objects`, {
    headers: getSupabaseServerHeaders(serviceRoleKey),
    query
  })
  return rows
})
