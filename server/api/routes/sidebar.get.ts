import type { NavigationMenuItem } from '@nuxt/ui'

type SidebarLinks = NavigationMenuItem[][]

const links: SidebarLinks = [
    [
        {
            label: 'Главная страница',
            icon: 'i-lucide-house',
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
            to: '/hr'
        },
        {
            label: 'Объекты',
            icon: 'i-lucide-map',
            to: '/zones'
        },
        {
            label: 'Настройки',
            to: '/settings',
            icon: 'i-lucide-settings',
            defaultOpen: true,
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
    [
        // {
        //   label: 'Feedback',
        //   icon: 'i-lucide-message-circle',
        //   to: 'https://github.com/nuxt-ui-templates/dashboard',
        //   target: '_blank'
        // },
        // {
        //   label: 'Help & Support',
        //   icon: 'i-lucide-info',
        //   to: 'https://github.com/nuxt-ui-templates/dashboard',
        //   target: '_blank'
        // }
    ]
]

export default eventHandler((): SidebarLinks => {
    return links
})
