import { getSupabaseServerConfig, getSupabaseServerHeaders } from '../../utils/supabase'
import {
  mapCustomerDbRowToRecord,
  mapUpdateBodyToDbUpdate,
  type CustomerDbRow,
  type UpdateCustomerBody,
  type WorkShift
} from './customers'
import type { H3Event } from 'h3'

function isWorkShift(value: unknown): value is WorkShift {
  return value === 'day' || value === 'night'
}

function parseCustomerId(event: H3Event) {
  const rawId = getRouterParam(event, 'id')
  const customerId = Number(rawId)
  if (!rawId || !Number.isInteger(customerId) || customerId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Некорректный идентификатор пользователя.'
    })
  }

  return customerId
}

function parseNonNegativeMoney(value: unknown, fieldName: string) {
  const amount = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(amount) || amount < 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `Поле ${fieldName} должно быть целым числом не меньше 0.`
    })
  }

  return amount
}

function parseUpdateBody(body: unknown): UpdateCustomerBody {
  if (!body || typeof body !== 'object') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Тело запроса должно быть корректным JSON-объектом.'
    })
  }

  const input = body as Record<string, unknown>
  const update: UpdateCustomerBody = {}

  if (input.workShift !== undefined) {
    if (!isWorkShift(input.workShift)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Поле workShift должно быть \'day\' или \'night\'.'
      })
    }
    update.workShift = input.workShift
  }

  if (input.baseSalary !== undefined) {
    update.baseSalary = parseNonNegativeMoney(input.baseSalary, 'baseSalary')
  }

  if (input.positionBonus !== undefined) {
    update.positionBonus = parseNonNegativeMoney(input.positionBonus, 'positionBonus')
  }

  if (Object.keys(update).length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Нужно передать хотя бы одно поле для обновления.'
    })
  }

  return update
}

export default eventHandler(async (event) => {
  const customerId = parseCustomerId(event)
  const updateBody = parseUpdateBody(await readBody(event))
  const { url, serviceRoleKey } = getSupabaseServerConfig()

  const rows = await $fetch<CustomerDbRow[]>(`${url}/rest/v1/customers`, {
    method: 'PATCH',
    headers: {
      ...getSupabaseServerHeaders(serviceRoleKey),
      Prefer: 'return=representation'
    },
    query: {
      id: `eq.${customerId}`
    },
    body: mapUpdateBodyToDbUpdate(updateBody)
  })

  const updatedRow = rows[0]
  if (!updatedRow) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Пользователь не найден.'
    })
  }

  return mapCustomerDbRowToRecord(updatedRow)
})
