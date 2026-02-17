import type { DropdownMenuItem } from '@nuxt/ui'

type UserMenuPayload = {
  user: {
    name: string
    avatar: {
      src: string
      alt: string
    }
  }
  groups: DropdownMenuItem[][]
}

const payload: UserMenuPayload = {
  user: {
    name: 'Нодир Усманов',
    avatar: {
      src: 'https://github.com/benjamincanac.png',
      alt: 'Усманов Нодир'
    }
  },
  groups: [
    [
      {
        label: 'Profile',
        icon: 'i-lucide-user'
      },
      {
        label: 'Billing',
        icon: 'i-lucide-credit-card'
      },
      {
        label: 'Settings',
        icon: 'i-lucide-settings',
        to: '/settings'
      }
    ],
    [
      {
        label: 'Templates',
        icon: 'i-lucide-layout-template',
        children: [
          {
            label: 'Starter',
            to: 'https://starter-template.nuxt.dev/'
          },
          {
            label: 'Landing',
            to: 'https://landing-template.nuxt.dev/'
          },
          {
            label: 'Docs',
            to: 'https://docs-template.nuxt.dev/'
          },
          {
            label: 'SaaS',
            to: 'https://saas-template.nuxt.dev/'
          },
          {
            label: 'Dashboard',
            to: 'https://dashboard-template.nuxt.dev/',
            color: 'primary',
            checked: true,
            type: 'checkbox'
          },
          {
            label: 'Chat',
            to: 'https://chat-template.nuxt.dev/'
          },
          {
            label: 'Portfolio',
            to: 'https://portfolio-template.nuxt.dev/'
          },
          {
            label: 'Changelog',
            to: 'https://changelog-template.nuxt.dev/'
          }
        ]
      }
    ],
    [
      {
        label: 'Documentation',
        icon: 'i-lucide-book-open',
        to: 'https://ui.nuxt.com/docs/getting-started/installation/nuxt',
        target: '_blank'
      },
      {
        label: 'GitHub repository',
        icon: 'i-simple-icons-github',
        to: 'https://github.com/nuxt-ui-templates/dashboard',
        target: '_blank'
      },
      {
        label: 'Log out',
        icon: 'i-lucide-log-out'
      }
    ]
  ]
}

export default eventHandler((): UserMenuPayload => {
  return payload
})
