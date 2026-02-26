export type DocumentStatus = 'sent' | 'partially_signed' | 'signed'

export interface SupabaseErrorData {
  code?: string
  message?: string
}

export interface DocumentTemplateDbRow {
  id: number
  name: string
  description: string | null
  contract_type: string
  html: string
  css: string
  storage_path: string
  created_at: string
  updated_at: string
}

export interface DocumentDispatchDbRow {
  id: number
  template_id: number | null
  title: string
  recipient_ids: number[]
  recipient_phones: string[]
  recipient_count: number
  signed_count: number
  status: DocumentStatus
  sent_at: string
}

export interface SignedDocumentDbRow {
  id: number
  dispatch_id: number | null
  template_id: number | null
  employee_name: string
  phone_number: string
  signed_at: string
  signed_via: string
  file_url: string | null
}

export interface DocumentTemplateRecord {
  id: number
  name: string
  description?: string
  contractType: string
  html: string
  css: string
  storagePath: string
  createdAt: string
  updatedAt: string
}

export interface DocumentDispatchRecord {
  id: number
  templateId: number | null
  templateName?: string
  title: string
  recipientIds: number[]
  recipientPhones: string[]
  recipientCount: number
  signedCount: number
  status: DocumentStatus
  sentAt: string
}

export interface SignedDocumentRecord {
  id: number
  dispatchId: number | null
  templateId: number | null
  templateName?: string
  employeeName: string
  phoneNumber: string
  signedAt: string
  signedVia: string
  fileUrl?: string
}

export function mapTemplateDbRowToRecord(row: DocumentTemplateDbRow): DocumentTemplateRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    contractType: row.contract_type,
    html: row.html,
    css: row.css,
    storagePath: row.storage_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function mapDispatchDbRowToRecord(row: DocumentDispatchDbRow): DocumentDispatchRecord {
  return {
    id: row.id,
    templateId: row.template_id,
    title: row.title,
    recipientIds: row.recipient_ids || [],
    recipientPhones: row.recipient_phones || [],
    recipientCount: row.recipient_count || 0,
    signedCount: row.signed_count || 0,
    status: row.status,
    sentAt: row.sent_at
  }
}

export function mapSignedDbRowToRecord(row: SignedDocumentDbRow): SignedDocumentRecord {
  return {
    id: row.id,
    dispatchId: row.dispatch_id,
    templateId: row.template_id,
    employeeName: row.employee_name,
    phoneNumber: row.phone_number,
    signedAt: row.signed_at,
    signedVia: row.signed_via,
    fileUrl: row.file_url || undefined
  }
}

export function sanitizePathSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'template'
}

export function encodeStoragePath(path: string) {
  return path.split('/').map(part => encodeURIComponent(part)).join('/')
}

function getErrorStatusCode(error: unknown) {
  if (!error || typeof error !== 'object' || !('statusCode' in error)) {
    return undefined
  }

  return typeof error.statusCode === 'number' ? error.statusCode : undefined
}

export function getSupabaseErrorData(error: unknown): SupabaseErrorData | undefined {
  if (!error || typeof error !== 'object') {
    return undefined
  }

  if (!('data' in error) || !error.data || typeof error.data !== 'object') {
    return undefined
  }

  return error.data as SupabaseErrorData
}

export async function ensureStorageBucket(options: {
  url: string
  serviceRoleKey: string
  bucket: string
  isPublic: boolean
  missingErrorMessage: string
}) {
  try {
    await $fetch(`${options.url}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        apikey: options.serviceRoleKey,
        Authorization: `Bearer ${options.serviceRoleKey}`,
        'Content-Type': 'application/json'
      },
      body: {
        id: options.bucket,
        name: options.bucket,
        public: options.isPublic
      }
    })
  } catch (error: unknown) {
    const statusCode = getErrorStatusCode(error)
    if (statusCode === 400 || statusCode === 409) {
      return
    }

    const data = getSupabaseErrorData(error)
    if (data?.message?.toLowerCase().includes('already exists')) {
      return
    }

    throw createError({
      statusCode: 500,
      statusMessage: options.missingErrorMessage
    })
  }
}

export async function uploadStorageObject(options: {
  url: string
  serviceRoleKey: string
  bucket: string
  path: string
  data: string | Uint8Array
  contentType: string
  uploadErrorMessage: string
}) {
  try {
    await $fetch(`${options.url}/storage/v1/object/${options.bucket}/${encodeStoragePath(options.path)}`, {
      method: 'POST',
      headers: {
        apikey: options.serviceRoleKey,
        Authorization: `Bearer ${options.serviceRoleKey}`,
        'Content-Type': options.contentType,
        'x-upsert': 'true'
      },
      body: options.data
    })
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: options.uploadErrorMessage
    })
  }
}

export async function downloadStorageObject(options: {
  url: string
  serviceRoleKey: string
  bucket: string
  path: string
  downloadErrorMessage: string
}) {
  try {
    const response = await $fetch.raw(`${options.url}/storage/v1/object/${options.bucket}/${encodeStoragePath(options.path)}`, {
      headers: {
        apikey: options.serviceRoleKey,
        Authorization: `Bearer ${options.serviceRoleKey}`
      }
    })

    return response._data as string
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: options.downloadErrorMessage
    })
  }
}

