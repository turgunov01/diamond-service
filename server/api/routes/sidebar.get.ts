import type { NavigationMenuItem } from '@nuxt/ui'

type SidebarLinks = NavigationMenuItem[][]

const links: SidebarLinks = [
  [
    {
      label: 'Дашборд',
      icon: 'i-lucide-line-chart',
      to: '/'
    },
    {
      label: 'Заявки',
      icon: 'i-lucide-inbox',
      to: '/inbox',
      badge: '4'
    },
    {
      label: 'HR',
      icon: 'i-lucide-users',
      to: '/hr',
      defaultOpen: false,
      type: 'trigger',
      children: [
        {
          label: 'Сотрудники',
          to: '/hr',
          exact: true
        },
        {
          label: 'Договоры',
          to: '/documents',
          exact: true
        }
      ]
    },
    {
      label: 'Объекты',
      icon: 'i-lucide-map',
      to: '/objects'
    },
    {
      label: 'Чаты',
      icon: 'i-lucide-message-circle',
      to: '/chats'
    },
    {
      label: 'Закупки',
      icon: 'i-lucide-shopping-cart',
      to: '/expenses'
    },
    {
      label: 'Настройки',
      to: '/settings',
      icon: 'i-lucide-settings',
      defaultOpen: false,
      type: 'trigger',
      children: [
        {
          label: 'Общее',
          to: '/settings',
          exact: true
        },
        {
          label: 'Пользователи',
          to: '/settings/members'
        },
        {
          label: 'Уведомления',
          to: '/settings/notifications'
        },
        {
          label: 'Безопасность',
          to: '/settings/security'
        }
      ]
    }
  ],
  []
]

export default eventHandler<SidebarLinks>(() => links)
