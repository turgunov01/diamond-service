<script setup lang="ts">
definePageMeta({
  ssr: false
})

type GrapesEditor = {
  getHtml: () => string
  getCss: () => string
  getProjectData: () => unknown
  loadProjectData: (data: unknown) => void
  setComponents: (components: string) => void
  setStyle: (style: string) => void
  destroy: () => void
  BlockManager?: {
    getAll?: () => { forEach?: (callback: (block: { getId?: () => string, id?: string }) => void) => void }
    add?: (id: string, options: {
      label: string
      category?: string
      content: string
      attributes?: Record<string, string>
    }) => void
    remove?: (id: string) => void
  }
}

interface TemplatePayload {
  id: number
  name: string
  description?: string
  contractType: string
  html: string
  css: string
  projectData?: {
    html?: string
    css?: string
    projectData?: unknown
  }
}

interface TemplateBlockItem {
  id: number
  name: string
  description?: string
  contractType: string
  html: string
  css: string
}

type ActiveObject = {
  id: number
  name: string
}

const toast = useToast()
const route = useRoute()
const router = useRouter()
const activeObject = useState<ActiveObject | null>('active-object', () => null)
const activeObjectIdCookie = useCookie<number | null>('active-object-id', { default: () => null })

useHead({
  link: [
    {
      rel: 'stylesheet',
      href: 'https://unpkg.com/grapesjs/dist/css/grapes.min.css'
    }
  ]
})

const editorRoot = ref<HTMLElement | null>(null)
const editor = ref<GrapesEditor | null>(null)

const templateName = ref('Новый шаблон')
const templateDescription = ref('')
const contractType = ref('gph')
const docPreviewBg = ref(
  'radial-gradient(circle at 25px 25px, #eef2ff 0, #eef2ff 4px, transparent 4px), linear-gradient(90deg, #f8fafc 1px, transparent 1px), linear-gradient(180deg, #f8fafc 1px, transparent 1px)'
)

const loading = ref(false)
const saving = ref(false)

const objectId = computed(() => activeObject.value?.id ?? activeObjectIdCookie.value ?? null)
const hasObjectScope = computed(() => Boolean(objectId.value))

const {
  data: templateLibrary,
  refresh: refreshTemplateLibrary,
  status: templateLibraryStatus
} = await useAsyncData<TemplateBlockItem[]>(
  'document-template-library',
  () => {
    if (!objectId.value) {
      return Promise.resolve([])
    }

    return $fetch('/api/documents/templates', {
      query: {
        objectId: objectId.value
      }
    })
  },
  {
    default: () => [],
    watch: [objectId],
    immediate: false
  }
)

const currentTemplateId = computed(() => {
  const raw = route.query.templateId
  const value = Array.isArray(raw) ? raw[0] : raw
  const id = Number(value)

  return Number.isInteger(id) && id > 0 ? id : null
})

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    const err = error as { data?: { statusMessage?: string }, message?: string }
    return err.data?.statusMessage || err.message
  }

  return undefined
}

const availableTemplateBlocks = computed(() =>
  (templateLibrary.value || []).filter(template => template.id !== currentTemplateId.value)
)

function syncTemplateBlocks() {
  const blockManager = editor.value?.BlockManager
  if (!blockManager?.getAll || !blockManager.add || !blockManager.remove) {
    return
  }

  const existingBlocks = blockManager.getAll()
  existingBlocks?.forEach?.((block) => {
    const id = typeof block.getId === 'function' ? block.getId() : block.id
    if (id?.startsWith('template-block-')) {
      blockManager.remove?.(id)
    }
  })

  availableTemplateBlocks.value.forEach((template) => {
    blockManager.add?.(`template-block-${template.id}`, {
      label: `${template.name} (${template.contractType.toUpperCase()})`,
      category: 'Шаблоны',
      content: `${template.html}${template.css ? `<style>${template.css}</style>` : ''}`,
      attributes: {
        class: 'gjs-block-section'
      }
    })
  })
}

async function initEditor() {
  if (!import.meta.client || !editorRoot.value || editor.value) {
    return
  }

  const grapesjs = (await import('grapesjs')).default

  editor.value = grapesjs.init({
    container: editorRoot.value,
    fromElement: false,
    height: '70vh',
    storageManager: false,
    blockManager: {
      appendTo: '#gjs-blocks'
    },
    styleManager: {
      appendTo: '#gjs-styles'
    },
    layerManager: {
      appendTo: '#gjs-layers'
    },
    panels: {
      defaults: []
    }
  }) as unknown as GrapesEditor

  editor.value.setComponents(`
    <section style="padding: 24px; font-family: Arial, sans-serif;">
      <h1>Договор</h1>
      <p>ФИО сотрудника: {{employee_name}}</p>
      <p>Номер телефона: {{phone_number}}</p>
      <p>Дата: {{date}}</p>
    </section>
  `)

  editor.value.setStyle(`
    body {
      margin: 0;
      background: #f7f8fa;
      color: #111827;
    }
  `)

  syncTemplateBlocks()
}

function applyTemplateToEditor(template: TemplatePayload) {
  templateName.value = template.name
  templateDescription.value = template.description || ''
  contractType.value = template.contractType || 'gph'

  const project = template.projectData

  if (project?.projectData && editor.value) {
    editor.value.loadProjectData(project.projectData)
    return
  }

  if (editor.value) {
    editor.value.setComponents(project?.html || template.html || '')
    editor.value.setStyle(project?.css || template.css || '')
  }
}

async function loadTemplate() {
  if (!currentTemplateId.value || !editor.value || !objectId.value) {
    return
  }

  loading.value = true

  try {
    const template = await $fetch<TemplatePayload>(`/api/documents/templates/${currentTemplateId.value}`, {
      query: {
        objectId: objectId.value
      }
    })
    applyTemplateToEditor(template)

    toast.add({
      title: 'Шаблон загружен',
      description: `ID: ${template.id}`,
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Не удалось загрузить шаблон',
      description: getErrorMessage(error) || 'Проверьте API шаблонов.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

async function saveTemplate() {
  if (!editor.value || saving.value || !objectId.value) {
    return
  }

  const normalizedName = templateName.value.trim()
  if (!normalizedName) {
    toast.add({
      title: 'Введите название шаблона',
      color: 'warning'
    })
    return
  }

  saving.value = true

  try {
    const payload = {
      objectId: objectId.value,
      name: normalizedName,
      description: templateDescription.value.trim(),
      contractType: contractType.value,
      html: editor.value.getHtml(),
      css: editor.value.getCss(),
      projectData: editor.value.getProjectData()
    }

    if (currentTemplateId.value) {
      await $fetch(`/api/documents/templates/${currentTemplateId.value}`, {
        method: 'PUT',
        body: payload
      })
    } else {
      const created = await $fetch<{ id: number }>('/api/documents/templates', {
        method: 'POST',
        body: payload
      })

      await router.replace({
        path: '/documents/builder',
        query: {
          templateId: String(created.id)
        }
      })
    }

    await refreshTemplateLibrary()
    syncTemplateBlocks()

    toast.add({
      title: 'Шаблон сохранен в Supabase',
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Не удалось сохранить шаблон',
      description: getErrorMessage(error) || 'Проверьте API и повторите попытку.',
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await initEditor()

  if (currentTemplateId.value && objectId.value) {
    await loadTemplate()
  }
})

watch(objectId, async (value) => {
  if (!value) {
    return
  }

  await refreshTemplateLibrary()
}, { immediate: true })

watch(availableTemplateBlocks, () => {
  syncTemplateBlocks()
})

watch([objectId, currentTemplateId], async ([nextObjectId]) => {
  if (!nextObjectId || !currentTemplateId.value || !editor.value) {
    return
  }

  await loadTemplate()
}, { immediate: true })

onBeforeUnmount(() => {
  editor.value?.destroy()
  editor.value = null
})
</script>

<template>
  <UDashboardPanel id="documents-builder">
    <template #header>
      <UDashboardNavbar title="Конструктор шаблона">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <div class="flex items-center gap-2">
            <UBadge
              v-if="activeObject"
              :label="activeObject.name"
              color="neutral"
              variant="subtle"
            />
            <UButton
              label="К списку"
              icon="i-lucide-arrow-left"
              color="neutral"
              variant="outline"
              @click="navigateTo('/documents')"
            />
            <UButton
              label="Загрузить"
              icon="i-lucide-download"
              color="neutral"
              variant="outline"
              :loading="loading"
              :disabled="!currentTemplateId || !hasObjectScope"
              @click="loadTemplate"
            />
            <UButton
              label="Сохранить"
              icon="i-lucide-save"
              :disabled="!hasObjectScope"
              :loading="saving"
              @click="saveTemplate"
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <UAlert
          v-if="!hasObjectScope"
          color="warning"
          variant="subtle"
          title="Объект не выбран"
          description="Выберите объект в верхнем меню. Шаблоны создаются и редактируются только внутри объекта."
        />

        <div class="grid gap-4 xl:grid-cols-[320px_minmax(640px,1fr)_320px] items-start">
          <div class="space-y-4">
            <div class="rounded-lg border border-default p-4 space-y-3 bg-elevated/40 backdrop-blur">
              <UFormField label="Название шаблона">
                <UInput v-model="templateName" class="w-full" :disabled="!hasObjectScope" />
              </UFormField>

              <UFormField label="Тип договора">
                <USelect
                  v-model="contractType"
                  :items="[
                    { label: 'ГПХ', value: 'gph' },
                    { label: 'NDA', value: 'nda' },
                    { label: 'Оффер', value: 'offer' },
                    { label: 'Прочее', value: 'other' }
                  ]"
                  value-key="value"
                  class="w-full"
                  :disabled="!hasObjectScope"
                />
              </UFormField>

              <UFormField label="Описание">
                <UTextarea
                  v-model="templateDescription"
                  class="w-full"
                  :rows="4"
                  :disabled="!hasObjectScope"
                />
              </UFormField>

              <div class="rounded-md border border-dashed border-default px-3 py-2 text-xs text-muted">
                Шаблон сохраняется в таблицу `document_templates` и привязывается к текущему объекту.
              </div>
            </div>
          </div>

          <div class="rounded-xl border border-default bg-elevated/20 p-4">
            <div class="doc-shell">
              <div
                class="doc-sheet"
                :style="{ backgroundImage: docPreviewBg }"
              >
                <div ref="editorRoot" class="h-full w-full" />
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <div class="rounded-lg border border-default bg-elevated/30 p-3">
              <div class="flex items-center justify-between pb-2">
                <p class="text-sm font-semibold text-highlighted">
                  Блоки
                </p>
                <UBadge :label="String(availableTemplateBlocks.length)" color="neutral" variant="subtle" />
              </div>
              <div id="gjs-blocks" class="max-h-[360px] overflow-auto pr-1" />
              <p v-if="templateLibraryStatus === 'pending'" class="pt-2 text-xs text-muted">
                Загрузка шаблонов...
              </p>
              <p v-else-if="!availableTemplateBlocks.length" class="pt-2 text-xs text-muted">
                Сохраненные шаблоны текущего объекта появятся здесь как блоки.
              </p>
            </div>

            <div class="rounded-lg border border-default bg-elevated/30 p-3">
              <p class="text-sm font-semibold text-highlighted pb-2">
                Слои
              </p>
              <div id="gjs-layers" class="max-h-[240px] overflow-auto pr-1" />
            </div>

            <div class="rounded-lg border border-default bg-elevated/30 p-3">
              <p class="text-sm font-semibold text-highlighted pb-2">
                Стили
              </p>
              <div id="gjs-styles" class="max-h-[320px] overflow-auto pr-1" />
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<style scoped>
.doc-shell {
  display: flex;
  justify-content: center;
  padding: 12px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(248, 250, 252, 0.8));
  min-height: 70vh;
}

.doc-sheet {
  position: relative;
  width: min(960px, 100%);
  aspect-ratio: 210 / 297;
  background-color: white;
  background-size: 180px 180px;
  background-repeat: repeat;
  box-shadow:
    0 10px 40px rgba(15, 23, 42, 0.14),
    0 4px 16px rgba(15, 23, 42, 0.1);
  border-radius: 10px;
  overflow: hidden;
  padding: 28px;
}
</style>
