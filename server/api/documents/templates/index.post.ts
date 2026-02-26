import { getSupabaseServerConfig, getSupabaseServerHeaders } from '../../../utils/supabase'
import {
  ensureStorageBucket,
  getSupabaseErrorData,
  mapTemplateDbRowToRecord,
  sanitizePathSegment,
  uploadStorageObject,
  type DocumentTemplateDbRow
} from '../documents'

interface CreateTemplateBody {
  name: string
  description?: string
  contractType?: string
  html?: string
  css?: string
  projectData?: unknown
}

function parseCreateTemplateBody(body: unknown): Required<Pick<CreateTemplateBody, 'name'>> & Omit<CreateTemplateBody, 'name'> {
  if (!body || typeof body !== 'object') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Body must be a valid object.'
    })
  }

  const input = body as CreateTemplateBody
  const name = typeof input.name === 'string' ? input.name.trim() : ''

  if (!name) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Template name is required.'
    })
  }

  return {
    name,
    description: typeof input.description === 'string' ? input.description.trim() : undefined,
    contractType: typeof input.contractType === 'string' && input.contractType.trim().length
      ? input.contractType.trim()
      : 'gph',
    html: typeof input.html === 'string' ? input.html : '',
    css: typeof input.css === 'string' ? input.css : '',
    projectData: input.projectData
  }
}

export default eventHandler(async (event) => {
  const payload = parseCreateTemplateBody(await readBody(event))
  const { url, serviceRoleKey, documentTemplateBucket } = getSupabaseServerConfig()

  await ensureStorageBucket({
    url,
    serviceRoleKey,
    bucket: documentTemplateBucket,
    isPublic: false,
    missingErrorMessage: `Unable to initialize storage bucket "${documentTemplateBucket}".`
  })

  const timestamp = Date.now()
  const safeName = sanitizePathSegment(payload.name)
  const uniqueId = crypto.randomUUID()
  const storagePath = `${safeName}/${timestamp}-${uniqueId}.json`

  const serializedProject = JSON.stringify({
    name: payload.name,
    description: payload.description,
    contractType: payload.contractType,
    html: payload.html,
    css: payload.css,
    projectData: payload.projectData,
    updatedAt: new Date().toISOString()
  })

  await uploadStorageObject({
    url,
    serviceRoleKey,
    bucket: documentTemplateBucket,
    path: storagePath,
    data: serializedProject,
    contentType: 'application/json; charset=utf-8',
    uploadErrorMessage: 'Failed to upload template project to Supabase storage.'
  })

  try {
    const rows = await $fetch<DocumentTemplateDbRow[]>(`${url}/rest/v1/document_templates`, {
      method: 'POST',
      headers: {
        ...getSupabaseServerHeaders(serviceRoleKey),
        Prefer: 'return=representation'
      },
      body: {
        name: payload.name,
        description: payload.description || null,
        contract_type: payload.contractType,
        html: payload.html,
        css: payload.css,
        storage_path: storagePath
      }
    })

    const createdRow = rows[0]
    if (!createdRow) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Supabase did not return created template row.'
      })
    }

    setResponseStatus(event, 201)
    return {
      ...mapTemplateDbRowToRecord(createdRow),
      projectData: payload.projectData
    }
  } catch (error: unknown) {
    const data = getSupabaseErrorData(error)

    if (data?.code === '42P01') {
      throw createError({
        statusCode: 500,
        statusMessage: 'Table "document_templates" is missing. Run db/supabase/documents.sql first.'
      })
    }

    if (data?.message) {
      throw createError({
        statusCode: 400,
        statusMessage: data.message
      })
    }

    throw error
  }
})

