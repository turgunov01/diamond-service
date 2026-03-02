<script lang="ts" setup>
const router = useRouter();
const toast = useToast();

const isCreating = ref(false);

const newZoneForm = reactive({
  name: "",
  description: "",
});

async function createZone() {
  if (!newZoneForm.name.trim()) {
    toast.add({
      title: "Error",
      description: "Zone name is required",
      color: "error",
    });
    return;
  }

  isCreating.value = true;

  try {
    await $fetch("/api/zones", {
      method: "POST",
      body: {
        name: newZoneForm.name.trim(),
        description: newZoneForm.description.trim() || null,
      },
    });

    toast.add({
      title: "Success",
      description: `Zone "${newZoneForm.name}" created`,
      color: "success",
    });

    router.push("/zones");
  } catch {
    toast.add({
      title: "Error",
      description: "Failed to create zone",
      color: "error",
    });
  } finally {
    isCreating.value = false;
  }
}

</script>

<template>
  <UDashboardPanel id="zone-create">
    <template #header>
      <UDashboardNavbar title="Create Zone">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            icon="i-lucide-arrow-left"
            variant="ghost"
            @click="router.push('/zones')"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="max-w-xl">
        <UCard :ui="{ divide: 'divide-y divide-default' }">
          <template #header>
            <h3 class="text-lg font-semibold">New Zone</h3>
          </template>

          <div class="space-y-6 flex flex-col">
            <UFormGroup label="Название локации" required>
              <UInput class="w-full"
                v-model="newZoneForm.name"
                placeholder="Введите название локации"
                autofocus
              />
            </UFormGroup>
            <UFormGroup label="Описание локации">
              <UTextarea class="w-full"
                v-model="newZoneForm.description"
                placeholder="Введите описание локации (необязательно)"
                :rows="4"
              />
            </UFormGroup>
          </div>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton label="Cancel" variant="outline" @click="router.push('/zones')" />
              <UButton label="Create" :loading="isCreating" @click="createZone" />
            </div>
          </template>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
