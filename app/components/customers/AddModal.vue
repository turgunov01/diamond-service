<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

/* ===============================
   SCHEMA
================================ */

const schema = z.object({
  username: z.string().min(3, "Имя пользователя слишком короткое"),
  password: z.string().min(6, "Пароль должен быть не менее 6 символов"),
  phoneNumber: z.string().min(7, "Номер телефона слишком короткий"),
  age: z.coerce
    .number()
    .int("Возраст должен быть целым числом")
    .min(18, "Возраст должен быть не менее 18"),
  workShift: z.enum(["day", "night"]),

  // edited: now storing only IDs instead of full objects
  objectPositions: z.array(z.number()).min(1, "Выберите хотя бы одну позицию"),
});

/* ===============================
   STATE
================================ */

const open = ref(false);
const loading = ref(false);
const avatarFile = ref<File | null>(null);
const passportFile = ref<File | null>(null);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  username: "",
  password: "",
  phoneNumber: "",
  age: 18,
  workShift: "day",

  // edited: must be number[]
  objectPositions: [],
});

/* ===============================
   FETCH POSITIONS
================================ */

// edited: typed interface
interface Position {
  id: number;
  name: string;
  description: string;
  createdAt: string;
}

const { data } = await useFetch<Position[]>("/api/zones", {
  default: () => [],
});

// edited: transform into label/value format
const positionOptions = computed(() =>
  (data.value || []).map((p) => ({
    label: p.name,
    value: p.id,
  }))
);

console.log("Загруженные зоны для позиций:", positionOptions.value);

/* ===============================
   HELPERS
================================ */

const toast = useToast();

function resetState() {
  state.username = "";
  state.password = "";
  state.phoneNumber = "";
  state.age = 18;
  state.workShift = "day";
  state.objectPositions = []; // edited
  avatarFile.value = null;
  passportFile.value = null;
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object") {
    const err = error as { data?: { statusMessage?: string }; message?: string };
    return err.data?.statusMessage || err.message;
  }
  return undefined;
}

function onAvatarFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  avatarFile.value = input.files?.[0] || null;
}

function onPassportFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  passportFile.value = input.files?.[0] || null;
}

/* ===============================
   SUBMIT
================================ */

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (loading.value) return;

  loading.value = true;

  try {
    if (!avatarFile.value) {
      throw new Error("Файл аватара обязателен.");
    }
    if (!passportFile.value) {
      throw new Error("Файл паспорта обязателен.");
    }

    const form = new FormData();
    form.append("username", event.data.username.trim());
    form.append("password", event.data.password);
    form.append("phoneNumber", event.data.phoneNumber.trim());
    form.append("age", String(event.data.age));
    form.append("workShift", event.data.workShift);

    // edited: sending IDs array
    form.append("objectPositions", JSON.stringify(event.data.objectPositions));

    form.append("avatarFile", avatarFile.value);
    form.append("passportFile", passportFile.value);

    await $fetch("/api/customers", {
      method: "POST",
      body: form,
    });

    toast.add({
      title: "Успешно",
      description: `Пользователь @${event.data.username} добавлен`,
      color: "success",
    });

    resetState();
    open.value = false;
    await refreshNuxtData();
  } catch (error: unknown) {
    toast.add({
      title: "Не удалось создать клиента",
      description:
        getErrorMessage(error) || "Проверьте введенные данные и попробуйте снова.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Добавить пользователя"
    description="Добавьте пользователя в базу данных"
  >
    <UButton label="Добавить пользователя" icon="i-lucide-plus" />

    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Имя пользователя" name="username">
          <UInput v-model="state.username" class="w-full" placeholder="alex.smith" />
        </UFormField>

        <UFormField label="Файл аватара">
          <input
            class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm"
            type="file"
            accept="image/*"
            :disabled="loading"
            @change="onAvatarFileChange"
          />
        </UFormField>

        <UFormField label="Пароль" name="password">
          <UInput
            v-model="state.password"
            type="password"
            class="w-full"
            placeholder="Надежный пароль"
          />
        </UFormField>

        <UFormField label="Номер телефона" name="phoneNumber">
          <UInput
            v-model="state.phoneNumber"
            class="w-full"
            placeholder="+1-202-555-0101"
          />
        </UFormField>

        <UFormField label="Файл паспорта">
          <input
            class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm"
            type="file"
            accept=".pdf,image/*"
            :disabled="loading"
            @change="onPassportFileChange"
          />
        </UFormField>

        <!-- <UFormField label="Возраст" name="age">
          <UInput v-model="state.age" type="number" class="w-full" />
        </UFormField> -->

        <UFormField label="Смена" name="workShift">
          <USelect
            v-model="state.workShift"
            :items="[
              { label: 'День', value: 'day' },
              { label: 'Ночь', value: 'night' },
            ]"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Позиции объекта" name="objectPositions">
          <USelectMenu
            v-model="state.objectPositions"
            :options="positionOptions"
            multiple
            searchable
            placeholder="Выберите позиции"
            class="w-full"
          />
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton
            label="Отмена"
            color="neutral"
            variant="subtle"
            :disabled="loading"
            @click="open = false"
          />
          <UButton
            label="Создать"
            color="primary"
            variant="solid"
            type="submit"
            :loading="loading"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
