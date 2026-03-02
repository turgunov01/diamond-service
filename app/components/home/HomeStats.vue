<script setup lang="ts">
import type { Period, Range, Stat } from "~/types";

const props = defineProps<{
  period: Period;
  range: Range;
}>();

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

const { data: customersData } = await useFetch("/api/customers", {
  query: {
    period: props.period,
    from: props.range?.start,
    to: props.range?.end,
  },
  watch: [() => props.period, () => props.range],
});

const customersCount = computed(() => {
  if (!customersData.value) return 0;

  if (Array.isArray(customersData.value)) {
    return customersData.value.length;
  }

  if ("customers" in customersData.value) {
    return customersData.value?.customers?.length || 0;
  }

  return 0;
});

const stats = computed<Stat[]>(() => [
  {
    title: "Сотрудники",
    icon: "i-lucide-users",
    value: customersCount.value,
    variation: 0,
    href: "/hr",
  },
  {
    title: "Расходы",
    icon: "i-lucide-chart-pie",
    value: formatCurrency(0),
    variation: 0,
  },
  {
    title: "Прибыль",
    icon: "i-lucide-circle-dollar-sign",
    value: formatCurrency(0),
    variation: 0,
  },
  {
    title: "Заявки",
    icon: "i-lucide-shopping-cart",
    value: 0,
    variation: 0,
  },
]);
</script>

<template>
  <UPageGrid class="lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-px">
    <UPageCard
      v-for="(stat, index) in stats"
      :key="index"
      :icon="stat.icon"
      :title="stat.title"
      :to="stat.href ? stat.href : '#'"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        wrapper: 'items-start',
        leading:
          'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col',
        title: 'font-normal text-muted text-xs uppercase',
      }"
      class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1"
    >
      <div class="flex items-center gap-2">
        <span class="text-2xl font-semibold text-highlighted">
          {{ stat.value }}
        </span>

        <UBadge
          :color="stat.variation > 0 ? 'success' : 'error'"
          variant="subtle"
          class="text-xs"
        >
          {{ stat.variation > 0 ? "+" : "" }}{{ stat.variation }}%
        </UBadge>
      </div>
    </UPageCard>
  </UPageGrid>
</template>
