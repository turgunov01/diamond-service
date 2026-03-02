import { getSupabaseServerConfig, getSupabaseServerHeaders } from '../../utils/supabase'
import {
  getSupabaseErrorData,
  mapDispatchDbRowToRecord,
  parseObjectIdInput,
  type DocumentDispatchDbRow,
  type DocumentStatus,
  type DocumentTemplateDbRow
} from './documents'

interface SendDocumentBody {
  objectId: number
  templateId: number
  recipientIds: number[]
  title?: string
}

interface CustomerLiteRow {
  id: number
  username: string
  phone_number: string
  building_id?: number | null
  object_pinned?: string | null
  object_positions?: string[] | null
}

interface ObjectLiteRow {
  id: number
  building_id?: number | null
  name: string
}

function parseSendBody(body: unknown): SendDocumentBody {
  if (!body || typeof body !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'Body must be a valid object.' })
  }

  const input = body as Partial<SendDocumentBody>
  const templateId = Number(input.templateId)

  if (!Number.isInteger(templateId) || templateId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'templateId must be a positive integer.' })
  }

  if (!Array.isArray(input.recipientIds) || !input.recipientIds.length) {
    throw createError({ statusCode: 400, statusMessage: 'recipientIds must contain at least one user id.' })
  }

  const recipientIds = input.recipientIds
    .map(id => Number(id))
    .filter(id => Number.isInteger(id) && id > 0)

  if (!recipientIds.length) {
    throw createError({ statusCode: 400, statusMessage: 'recipientIds must contain valid positive integers.' })
  }

  return {
    objectId: parseObjectIdInput(input.objectId),
    templateId,
    recipientIds: Array.from(new Set(recipientIds)),
    title: typeof input.title === 'string' && input.title.trim().length ? input.title.trim() : undefined
  }
}

function encodePostgrestIn(values: number[]) {
  return `(${values.join(',')})`
}

function resolveStatus(recipientCount: number, signedCount: number): DocumentStatus {
  if (signedCount <= 0) {
    return 'sent'
  }

  if (signedCount >= recipientCount) {
    return 'signed'
  }

  return 'partially_signed'
}

export default eventHandler(async (event) => {
  const payload = parseSendBody(await readBody(event))
  const { url, serviceRoleKey } = getSupabaseServerConfig()
  const headers = getSupabaseServerHeaders(serviceRoleKey)

  let templateRows: DocumentTemplateDbRow[]
  try {
    templateRows = await $fetch<DocumentTemplateDbRow[]>(`${url}/rest/v1/document_templates`, {
      headers,
      query: {
        select: 'id,object_id,name,description,contract_type,html,css,storage_path,created_at,updated_at',
        id: `eq.${payload.templateId}`,
        object_id: `eq.${payload.objectId}`,
        limit: 1
      }
    })
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

  const template = templateRows[0]
  if (!template) {
    throw createError({ statusCode: 404, statusMessage: 'Template not found.' })
  }

  const objectRows = await $fetch<ObjectLiteRow[]>(`${url}/rest/v1/objects`, {
    headers,
    query: {
      select: 'id,building_id,name',
      id: `eq.${payload.objectId}`,
      limit: 1
    }
  })

  const currentObject = objectRows[0]
  if (!currentObject) {
    throw createError({ statusCode: 404, statusMessage: 'Object not found.' })
  }

  const customers = await $fetch<CustomerLiteRow[]>(`${url}/rest/v1/customers`, {
    headers,
    query: {
      select: 'id,username,phone_number,building_id,object_pinned,object_positions',
      id: `in.${encodePostgrestIn(payload.recipientIds)}`,
      ...(currentObject.building_id ? { building_id: `eq.${currentObject.building_id}` } : {}),
      order: 'id.asc'
    }
  })

  const eligibleCustomers = customers.filter((customer) => {
    const pinned = (customer.object_pinned || '').trim()
    const positions = customer.object_positions || []

    return pinned === currentObject.name || positions.includes(currentObject.name)
  })

  if (!eligibleCustomers.length) {
    throw createError({ statusCode: 404, statusMessage: 'Recipients were not found for this object.' })
  }

  const recipientIds = eligibleCustomers.map(customer => customer.id)
  const recipientPhones = eligibleCustomers.map(customer => customer.phone_number)
  const dispatchTitle = payload.title || `${template.name} - ${new Date().toLocaleDateString('ru-RU')}`

  const insertedDispatchRows = await $fetch<DocumentDispatchDbRow[]>(`${url}/rest/v1/document_dispatches`, {
    method: 'POST',
    headers: {
      ...headers,
      Prefer: 'return=representation'
    },
    body: {
      object_id: payload.objectId,
      template_id: template.id,
      title: dispatchTitle,
      recipient_ids: recipientIds,
      recipient_phones: recipientPhones,
      recipient_count: recipientIds.length,
      signed_count: 0,
      status: 'sent',
      sent_at: new Date().toISOString()
    }
  })

  const dispatch = insertedDispatchRows[0]
  if (!dispatch) {
    throw createError({ statusCode: 500, statusMessage: 'Supabase did not return dispatch row.' })
  }

  const simulatedSignedCustomers = eligibleCustomers.filter((_customer, index) => index % 2 === 0)

  if (simulatedSignedCustomers.length) {
    await $fetch(`${url}/rest/v1/signed_documents`, {
      method: 'POST',
      headers,
      body: simulatedSignedCustomers.map(customer => ({
        object_id: payload.objectId,
        dispatch_id: dispatch.id,
        template_id: template.id,
        employee_name: customer.username,
        phone_number: customer.phone_number,
        signed_at: new Date().toISOString(),
        signed_via: 'mobile',
        file_url: null
      }))
    })
  }

  const signedCount = simulatedSignedCustomers.length
  const status = resolveStatus(recipientIds.length, signedCount)

  const updatedRows = await $fetch<DocumentDispatchDbRow[]>(`${url}/rest/v1/document_dispatches`, {
    method: 'PATCH',
    headers: {
      ...headers,
      Prefer: 'return=representation'
    },
    query: {
      id: `eq.${dispatch.id}`,
      object_id: `eq.${payload.objectId}`
    },
    body: {
      signed_count: signedCount,
      status
    }
  })

  const updatedDispatch = updatedRows[0] || dispatch

  return {
    ...mapDispatchDbRowToRecord(updatedDispatch),
    templateName: template.name
  }
})
