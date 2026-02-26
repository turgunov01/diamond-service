import { getSupabaseServerConfig, getSupabaseServerHeaders } from '../../../utils/supabase'
import {
  mapTemplateDbRowToRecord,
  type DocumentTemplateDbRow
} from '../documents'

export default eventHandler(async () => {
  const { url, serviceRoleKey } = getSupabaseServerConfig()

  const rows = await $fetch<DocumentTemplateDbRow[]>(`${url}/rest/v1/document_templates`, {
    headers: getSupabaseServerHeaders(serviceRoleKey),
    query: {
      select: 'id,name,description,contract_type,html,css,storage_path,created_at,updated_at',
      order: 'id.desc'
    }
  })

  return rows.map(mapTemplateDbRowToRecord)
})

