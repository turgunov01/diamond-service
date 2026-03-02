<script setup lang="ts">
import { eachDayOfInterval, eachMonthOfInterval, eachWeekOfInterval, endOfDay, endOfMonth, endOfWeek, format } from 'date-fns'
import { VisArea, VisAxis, VisCrosshair, VisLine, VisTooltip, VisXYContainer } from '@unovis/vue'
import type { Period, Range } from '~/types'

const cardRef = useTemplateRef<HTMLElement | null>('cardRef')

const props = defineProps<{
  period: Period
  range: Range
}>()

type DataRecord = {
  date: Date
  amount: number
}

type ExpenseItem = {
  id: number
  plannedAmount: number
  actualAmount?: number
  currency: string
  createdAt: string
}

type ExpensesResponse = {
  items: ExpenseItem[]
}

type RatesResponse = {
  base: string
  updatedAt: number
  rates: Record<string, number>
}

const { width } = useElementSize(cardRef)

const data = ref<DataRecord[]>([])

const allowedCurrencies = ['UZS', 'USD', 'EUR', 'RUB'] as const
type CurrencyCode = (typeof allowedCurrencies)[number]

const currency = useState<CurrencyCode>('dashboard-currency', () => 'UZS')
const activeObject = useState<{ id: number, name: string } | null>('active-object')

function safeCurrency(code?: string): CurrencyCode {
  return allowedCurrencies.includes(code as CurrencyCode) ? code as CurrencyCode : 'USD'
}

const { data: fxData } = await useAsyncData<RatesResponse>('fx-latest', () => $fetch('/api/rates/latest'), {
  default: () => ({
    base: 'USD',
    updatedAt: Date.now(),
    rates: { USD: 1, EUR: 0.9, RUB: 90, UZS: 13000 }
  })
})

function toUsd(amount: number, code?: string) {
  const rate = fxData.value?.rates?.[safeCurrency(code)] ?? 1
  if (!rate) return amount
  return amount / rate
}

function fromUsd(amount: number, code?: string) {
  const rate = fxData.value?.rates?.[safeCurrency(code)] ?? 1
  return amount * rate
}

function convert(amount: number, from?: string, to?: string) {
  const fromCode = safeCurrency(from)
  const toCode = safeCurrency(to)

  if (fromCode === toCode) {
    return amount
  }

  return fromUsd(toUsd(amount, fromCode), toCode)
}

function formatCurrency(amount: number, code: string) {
  const selected = safeCurrency(code)

  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: selected,
    maximumFractionDigits: selected === 'UZS' ? 0 : 2
  }).format(Number.isFinite(amount) ? amount : 0)
}

const { data: expensesData, execute: executeExpenses } = await useFetch<ExpensesResponse>('/api/expenses', {
  default: () => ({
    items: []
  }),
  query: {
    objectId: computed(() => activeObject.value?.id)
  },
  immediate: false
})

watch(activeObject, (value) => {
  if (value?.id) {
    executeExpenses()
  }
}, { immediate: true })

function revenueForItems(items: ExpenseItem[]) {
  let planned = 0
  let actual = 0

  for (const item of items) {
    const plannedAmount = Number(item.plannedAmount)
    const actualAmount = Number(item.actualAmount)

    planned += convert(Number.isFinite(plannedAmount) ? plannedAmount : 0, item.currency || 'UZS', currency.value)
    actual += convert(Number.isFinite(actualAmount) ? actualAmount : 0, item.currency || 'UZS', currency.value)
  }

  return planned - actual
}

function recompute() {
  if (!expensesData.value || !props.range?.start || !props.range?.end) {
    data.value = []
    return
  }

  const intervalBuilders: Record<Period, (range: Range) => { start: Date, end: Date, label: Date }[]> = {
    daily: range => eachDayOfInterval(range).map(date => ({
      start: date,
      end: endOfDay(date),
      label: date
    })),
    weekly: range => eachWeekOfInterval(range, { weekStartsOn: 1 }).map(start => ({
      start,
      end: endOfWeek(start, { weekStartsOn: 1 }),
      label: start
    })),
    monthly: range => eachMonthOfInterval(range).map(start => ({
      start,
      end: endOfMonth(start),
      label: start
    }))
  }

  data.value = intervalBuilders[props.period](props.range).map(({ start, end, label }) => {
    const bucketItems = expensesData.value!.items.filter(item => {
      const created = new Date(item.createdAt)
      return created >= start && created <= end
    })

    return {
      date: label,
      amount: revenueForItems(bucketItems)
    }
  })
}

watch([() => props.period, () => props.range, expensesData, currency], recompute, { immediate: true })

const x = (_: DataRecord, index: number) => index
const y = (item: DataRecord) => item.amount

const total = computed(() => data.value.reduce((sum, item) => sum + item.amount, 0))

function formatDate(date: Date): string {
  return ({
    daily: format(date, 'd MMM'),
    weekly: format(date, 'd MMM'),
    monthly: format(date, 'MMM yyy')
  })[props.period]
}

function xTicks(index: number) {
  if (index === 0 || index === data.value.length - 1 || !data.value[index]) {
    return ''
  }

  return formatDate(data.value[index].date)
}

const template = (item: DataRecord) => `${formatDate(item.date)}: ${formatCurrency(item.amount, currency.value)}`
</script>

<template>
  <UCard ref="cardRef" :ui="{ root: 'overflow-visible', body: '!px-0 !pt-0 !pb-3' }">
    <template #header>
      <div>
        <p class="text-xs text-muted uppercase mb-1.5">
          Revenue
        </p>
        <p class="text-3xl text-highlighted font-semibold">
          {{ formatCurrency(total, currency) }}
        </p>
      </div>
    </template>

    <VisXYContainer
      :data="data"
      :padding="{ top: 40 }"
      class="h-96"
      :width="width"
    >
      <VisLine
        :x="x"
        :y="y"
        color="var(--ui-primary)"
      />
      <VisArea
        :x="x"
        :y="y"
        color="var(--ui-primary)"
        :opacity="0.1"
      />

      <VisAxis
        type="x"
        :x="x"
        :tick-format="xTicks"
      />

      <VisCrosshair
        color="var(--ui-primary)"
        :template="template"
      />

      <VisTooltip />
    </VisXYContainer>
  </UCard>
</template>

<style scoped>
.unovis-xy-container {
  --vis-crosshair-line-stroke-color: var(--ui-primary);
  --vis-crosshair-circle-stroke-color: var(--ui-bg);

  --vis-axis-grid-color: var(--ui-border);
  --vis-axis-tick-color: var(--ui-border);
  --vis-axis-tick-label-color: var(--ui-text-dimmed);

  --vis-tooltip-background-color: var(--ui-bg);
  --vis-tooltip-border-color: var(--ui-border);
  --vis-tooltip-text-color: var(--ui-text-highlighted);
}
</style>
