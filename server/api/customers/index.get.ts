import { getSupabaseServerConfig, getSupabaseServerHeaders } from '../../utils/supabase'
import { mapCustomerDbRowToRecord, type CustomerDbRow } from './customers'

export default eventHandler(async (event) => {
  const { url, serviceRoleKey } = getSupabaseServerConfig()
  const buildingIdRaw = getQuery(event).buildingId
  const buildingId = typeof buildingIdRaw === 'string' ? Number(buildingIdRaw) : NaN

  const query: Record<string, string> = {
    select: 'id,building_id,username,avatar,password,phone_number,passport_file,age,work_shift,object_pinned,object_positions,base_salary,position_bonus,salary_currency',
    order: 'id.asc'
  }

  if (Number.isInteger(buildingId) && buildingId > 0) {
    query.building_id = `eq.${buildingId}`
  }

  let rows: CustomerDbRow[]

  try {
    rows = await $fetch<CustomerDbRow[]>(`${url}/rest/v1/customers`, {
      headers: getSupabaseServerHeaders(serviceRoleKey),
      query
    })
  } catch {
    // Fallback for old schema if salary columns are not added yet.
    const fallbackQuery: Record<string, string> = {
      select: 'id,building_id,username,avatar,password,phone_number,passport_file,age,work_shift,object_pinned,object_positions',
      order: 'id.asc'
    }

    if (Number.isInteger(buildingId) && buildingId > 0) {
      fallbackQuery.building_id = `eq.${buildingId}`
    }

    rows = await $fetch<CustomerDbRow[]>(`${url}/rest/v1/customers`, {
      headers: getSupabaseServerHeaders(serviceRoleKey),
      query: fallbackQuery
    })
  }

  return rows.map(mapCustomerDbRowToRecord)
})
