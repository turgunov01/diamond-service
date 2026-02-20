import { getSupabaseServerConfig, getSupabaseServerHeaders } from '../../utils/supabase'
import { mapCustomerDbRowToRecord, type CustomerDbRow } from './customers'

export default eventHandler(async () => {
  const { url, serviceRoleKey } = getSupabaseServerConfig()

  let rows: CustomerDbRow[]

  try {
    rows = await $fetch<CustomerDbRow[]>(`${url}/rest/v1/customers`, {
      headers: getSupabaseServerHeaders(serviceRoleKey),
      query: {
        select: 'id,username,avatar,password,phone_number,passport_file,age,work_shift,object_pinned,object_positions,base_salary,position_bonus,salary_currency',
        order: 'id.asc'
      }
    })
  } catch {
    // Fallback for old schema if salary columns are not added yet.
    rows = await $fetch<CustomerDbRow[]>(`${url}/rest/v1/customers`, {
      headers: getSupabaseServerHeaders(serviceRoleKey),
      query: {
        select: 'id,username,avatar,password,phone_number,passport_file,age,work_shift,object_pinned,object_positions',
        order: 'id.asc'
      }
    })
  }

  return rows.map(mapCustomerDbRowToRecord)
})
