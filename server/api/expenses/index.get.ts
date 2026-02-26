import { getSupabaseServerConfig, getSupabaseServerHeaders } from '../../utils/supabase'
import {
  mapExpenseDbRowToRecord,
  type ExpenseDbRow,
  type ExpenseRecord
} from './expenses'

interface ExpenseSummary {
  totalPlanned: number
  totalActual: number
  byStatus: Record<string, number>
}

interface ExpenseResponse {
  items: ExpenseRecord[]
  summary: ExpenseSummary
}

export default eventHandler(async (): Promise<ExpenseResponse> => {
  const { url, serviceRoleKey } = getSupabaseServerConfig()

  const rows = await $fetch<ExpenseDbRow[]>(`${url}/rest/v1/expenses`, {
    headers: getSupabaseServerHeaders(serviceRoleKey),
    query: {
      select: 'id,title,category,vendor,planned_amount,actual_amount,currency,due_date,status,notes,created_at,updated_at',
      order: 'id.desc'
    }
  })

  const items = rows.map(mapExpenseDbRowToRecord)

  const summary: ExpenseSummary = {
    totalPlanned: items.reduce((sum, item) => sum + item.plannedAmount, 0),
    totalActual: items.reduce((sum, item) => sum + (item.actualAmount || 0), 0),
    byStatus: {
      draft: 0,
      approved: 0,
      rejected: 0,
      paid: 0
    }
  }

  for (const item of items) {
    summary.byStatus[item.status] = (summary.byStatus[item.status] || 0) + 1
  }

  return {
    items,
    summary
  }
})

