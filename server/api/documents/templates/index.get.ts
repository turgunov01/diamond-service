import { getSupabaseServerConfig, getSupabaseServerHeaders } from '../../../utils/supabase'
import {
  mapTemplateDbRowToRecord,
  parseObjectIdInput,
  type DocumentTemplateDbRow
} from '../documents'

export default eventHandler(async (event) => {
  const { url, serviceRoleKey } = getSupabaseServerConfig()
  const objectId = parseObjectIdInput(getQuery(event).objectId, 'objectId query param is required.')

  const rows = await $fetch<DocumentTemplateDbRow[]>(`${url}/rest/v1/document_templates`, {
    headers: getSupabaseServerHeaders(serviceRoleKey),
    query: {
      select: 'id,object_id,name,description,contract_type,html,css,storage_path,created_at,updated_at',
      object_id: `eq.${objectId}`,
      order: 'id.desc'
    }
  })

  return rows.map(mapTemplateDbRowToRecord)
})
