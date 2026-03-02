import { getSupabaseServerConfig, getSupabaseServerHeaders } from '../../utils/supabase'
import {
  getSupabaseErrorData,
  mapDispatchDbRowToRecord,
  mapSignedDbRowToRecord,
  mapTemplateDbRowToRecord,
  type DocumentDispatchDbRow,
  type DocumentDispatchRecord,
  type DocumentTemplateDbRow,
  type DocumentTemplateRecord,
  type SignedDocumentDbRow,
  type SignedDocumentRecord
} from './documents'

interface DocumentsResponse {
  templates: DocumentTemplateRecord[]
  sent: DocumentDispatchRecord[]
  signed: SignedDocumentRecord[]
}

function isMissingTableError(error: unknown) {
  const data = getSupabaseErrorData(error)
  return data?.code === '42P01'
}

async function fetchRowsOrEmpty<T>(request: () => Promise<T[]>) {
  try {
    return await request()
  } catch (error: unknown) {
    if (isMissingTableError(error)) {
      return []
    }
    throw error
  }
}

export default eventHandler(async (): Promise<DocumentsResponse> => {
  const { url, serviceRoleKey } = getSupabaseServerConfig()
  const headers = getSupabaseServerHeaders(serviceRoleKey)

  const [templateRows, dispatchRows, signedRows] = await Promise.all([
    fetchRowsOrEmpty<DocumentTemplateDbRow>(() => $fetch<DocumentTemplateDbRow[]>(`${url}/rest/v1/document_templates`, {
      headers,
      query: {
        select: 'id,name,description,contract_type,html,css,storage_path,created_at,updated_at',
        order: 'id.desc'
      }
    })),
    fetchRowsOrEmpty<DocumentDispatchDbRow>(() => $fetch<DocumentDispatchDbRow[]>(`${url}/rest/v1/document_dispatches`, {
      headers,
      query: {
        select: 'id,template_id,title,recipient_ids,recipient_phones,recipient_count,signed_count,status,sent_at',
        order: 'id.desc'
      }
    })),
    fetchRowsOrEmpty<SignedDocumentDbRow>(() => $fetch<SignedDocumentDbRow[]>(`${url}/rest/v1/signed_documents`, {
      headers,
      query: {
        select: 'id,dispatch_id,template_id,employee_name,phone_number,signed_at,signed_via,file_url',
        order: 'signed_at.desc'
      }
    }))
  ])

  const templates = templateRows.map(mapTemplateDbRowToRecord)
  const templateNameById = new Map(templates.map(template => [template.id, template.name]))

  const sent = dispatchRows
    .map(mapDispatchDbRowToRecord)
    .map((dispatch) => ({
      ...dispatch,
      templateName: dispatch.templateId ? templateNameById.get(dispatch.templateId) : undefined
    }))

  const signed = signedRows
    .map(mapSignedDbRowToRecord)
    .map((item) => ({
      ...item,
      templateName: item.templateId ? templateNameById.get(item.templateId) : undefined
    }))

  return {
    templates,
    sent,
    signed
  }
})

