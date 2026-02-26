import * as XLSX from 'xlsx'
import { getSupabaseServerConfig, getSupabaseServerHeaders } from '../../utils/supabase'
import {
  mapCreateBodyToDbInsert,
  type CreateCustomerBody,
  type CustomerDbRow,
  type WorkShift
} from './customers'

interface ImportRowError {
  row: number
  message: string
}

interface MultipartPart {
  name?: string
  filename?: string
  type?: string
  data: Uint8Array
}

interface SourceRow {
  username?: string
  password?: string
  phoneNumber?: string
  age?: number | string
  workShift?: WorkShift | string
  objectPinned?: string
  objectPositions?: string | string[]
  baseSalary?: number | string
  positionBonus?: number | string
  avatarUrl?: string
  passportFile?: string
}

interface ExistingCustomerLiteRow {
  id: number
  username: string
  phone_number: string
}

function normalizePhone(raw: unknown) {
  if (typeof raw !== 'string') {
    return ''
  }

  const trimmed = raw.trim()
  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')

  if (digits.length < 9) {
    return ''
  }

  return hasPlus ? `+${digits}` : digits
}

function parseWorkShift(value: unknown): WorkShift | null {
  if (value === 'day' || value === 'night') {
    return value
  }

  return null
}

function parseObjectPositions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(item => String(item).trim())
      .filter(Boolean)
  }

  if (typeof value !== 'string') {
    return []
  }

  const trimmed = value.trim()
  if (!trimmed.length) {
    return []
  }

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed
          .map(item => String(item).trim())
          .filter(Boolean)
      }
    } catch {
      // Ignore invalid json and fallback to comma parser.
    }
  }

  return trimmed
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function parseNonNegativeInt(value: unknown, fallback: number) {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null
  }

  return parsed
}

function toStringOrNumber(value: unknown): string | number | undefined {
  if (typeof value === 'string' || typeof value === 'number') {
    return value
  }

  return undefined
}

function toRowObject(raw: Record<string, unknown>): SourceRow {
  return {
    username: typeof raw.username === 'string' ? raw.username : undefined,
    password: typeof raw.password === 'string' ? raw.password : undefined,
    phoneNumber: typeof raw.phoneNumber === 'string'
      ? raw.phoneNumber
      : (typeof raw.phone_number === 'string' ? raw.phone_number : undefined),
    age: toStringOrNumber(raw.age),
    workShift: typeof raw.workShift === 'string'
      ? raw.workShift
      : (typeof raw.work_shift === 'string' ? raw.work_shift : undefined),
    objectPinned: typeof raw.objectPinned === 'string'
      ? raw.objectPinned
      : (typeof raw.object_pinned === 'string' ? raw.object_pinned : undefined),
    objectPositions: typeof raw.objectPositions === 'string'
      ? raw.objectPositions
      : (typeof raw.object_positions === 'string' || Array.isArray(raw.object_positions)
          ? raw.object_positions as string | string[]
          : undefined),
    baseSalary: toStringOrNumber(raw.baseSalary ?? raw.base_salary),
    positionBonus: toStringOrNumber(raw.positionBonus ?? raw.position_bonus),
    avatarUrl: typeof raw.avatarUrl === 'string'
      ? raw.avatarUrl
      : (typeof raw.avatar_url === 'string' ? raw.avatar_url : undefined),
    passportFile: typeof raw.passportFile === 'string'
      ? raw.passportFile
      : (typeof raw.passport_file === 'string' ? raw.passport_file : undefined)
  }
}

function sanitizeUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '.')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.|\.$/g, '')
}

function parseSpreadsheet(bytes: Uint8Array, fileName: string) {
  const extension = fileName.toLowerCase().split('.').pop()

  if (extension === 'csv') {
    const text = new TextDecoder().decode(bytes)
    const workbook = XLSX.read(text, { type: 'string' })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      return [] as Record<string, unknown>[]
    }
    const worksheet = workbook.Sheets[sheetName]
    if (!worksheet) {
      return [] as Record<string, unknown>[]
    }
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' })
  }

  const workbook = XLSX.read(bytes, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    return [] as Record<string, unknown>[]
  }

  const worksheet = workbook.Sheets[sheetName]
  if (!worksheet) {
    return [] as Record<string, unknown>[]
  }

  return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' })
}

export default eventHandler(async (event) => {
  const form = await readMultipartFormData(event)
  if (!form?.length) {
    throw createError({ statusCode: 400, statusMessage: 'multipart/form-data is empty.' })
  }

  const filePart = form.find((part) => part.name === 'file' && part.filename) as MultipartPart | undefined
  if (!filePart || !filePart.filename) {
    throw createError({ statusCode: 400, statusMessage: 'File is required in field "file".' })
  }

  const rawRows = parseSpreadsheet(filePart.data, filePart.filename)

  if (!rawRows.length) {
    throw createError({ statusCode: 400, statusMessage: 'Spreadsheet is empty.' })
  }

  const { url, serviceRoleKey } = getSupabaseServerConfig()
  const headers = getSupabaseServerHeaders(serviceRoleKey)

  const existingCustomers = await $fetch<ExistingCustomerLiteRow[]>(`${url}/rest/v1/customers`, {
    headers,
    query: {
      select: 'id,username,phone_number'
    }
  })

  const existingPhoneSet = new Set(existingCustomers.map(customer => normalizePhone(customer.phone_number)))
  const existingUsernameSet = new Set(existingCustomers.map(customer => customer.username.trim().toLowerCase()))

  const seenFilePhones = new Set<string>()
  const seenFileUsernames = new Set<string>()

  const errors: ImportRowError[] = []
  const insertRows: ReturnType<typeof mapCreateBodyToDbInsert>[] = []

  rawRows.forEach((rawRow, index) => {
    const rowNumber = index + 2
    const row = toRowObject(rawRow)

    const usernameSource = typeof row.username === 'string' ? row.username : ''
    const username = sanitizeUsername(usernameSource)
    if (!username || username.length < 3) {
      errors.push({ row: rowNumber, message: 'username is required and must be at least 3 chars.' })
      return
    }

    if (existingUsernameSet.has(username) || seenFileUsernames.has(username)) {
      errors.push({ row: rowNumber, message: `username "${username}" already exists.` })
      return
    }

    const password = typeof row.password === 'string' ? row.password.trim() : ''
    if (password.length < 6) {
      errors.push({ row: rowNumber, message: 'password is required and must be at least 6 chars.' })
      return
    }

    const phoneNumber = normalizePhone(row.phoneNumber)
    if (!phoneNumber) {
      errors.push({ row: rowNumber, message: 'phoneNumber is required and must be valid.' })
      return
    }

    if (existingPhoneSet.has(phoneNumber)) {
      errors.push({ row: rowNumber, message: `phone ${phoneNumber} already exists in database.` })
      return
    }

    if (seenFilePhones.has(phoneNumber)) {
      errors.push({ row: rowNumber, message: `phone ${phoneNumber} is duplicated in file.` })
      return
    }

    const age = parseNonNegativeInt(row.age, -1)
    if (!age || age < 18) {
      errors.push({ row: rowNumber, message: 'age must be integer and >= 18.' })
      return
    }

    const workShift = parseWorkShift(row.workShift)
    if (!workShift) {
      errors.push({ row: rowNumber, message: 'workShift must be "day" or "night".' })
      return
    }

    const objectPinned = typeof row.objectPinned === 'string' ? row.objectPinned.trim() : ''
    if (!objectPinned) {
      errors.push({ row: rowNumber, message: 'objectPinned is required.' })
      return
    }

    const objectPositions = parseObjectPositions(row.objectPositions)
    if (!objectPositions.length) {
      errors.push({ row: rowNumber, message: 'objectPositions must contain at least one item.' })
      return
    }

    const baseSalary = parseNonNegativeInt(row.baseSalary, 1000000)
    if (baseSalary === null) {
      errors.push({ row: rowNumber, message: 'baseSalary must be integer >= 0.' })
      return
    }

    const positionBonus = parseNonNegativeInt(row.positionBonus, 0)
    if (positionBonus === null) {
      errors.push({ row: rowNumber, message: 'positionBonus must be integer >= 0.' })
      return
    }

    const avatarSrc = typeof row.avatarUrl === 'string' && row.avatarUrl.trim().length
      ? row.avatarUrl.trim()
      : `https://i.pravatar.cc/128?u=${encodeURIComponent(username)}`

    const passportFile = typeof row.passportFile === 'string' && row.passportFile.trim().length
      ? row.passportFile.trim()
      : `bulk-import/${username}.pdf`

    const body: CreateCustomerBody = {
      username,
      avatar: { src: avatarSrc },
      password,
      phoneNumber,
      passportFile,
      age,
      workShift,
      objectPinned,
      objectPositions,
      baseSalary,
      positionBonus,
      salaryCurrency: 'UZS'
    }

    insertRows.push(mapCreateBodyToDbInsert(body))
    seenFilePhones.add(phoneNumber)
    seenFileUsernames.add(username)
  })

  if (!insertRows.length) {
    return {
      imported: 0,
      skipped: rawRows.length,
      errors
    }
  }

  let createdRows: CustomerDbRow[] = []

  try {
    createdRows = await $fetch<CustomerDbRow[]>(`${url}/rest/v1/customers`, {
      method: 'POST',
      headers: {
        ...headers,
        Prefer: 'return=representation'
      },
      body: insertRows
    })
  } catch (error: unknown) {
    const message = error && typeof error === 'object' && 'message' in error
      ? String((error as { message: string }).message)
      : 'Bulk import failed.'

    throw createError({
      statusCode: 400,
      statusMessage: message
    })
  }

  return {
    imported: createdRows.length,
    skipped: rawRows.length - createdRows.length,
    errors
  }
})

