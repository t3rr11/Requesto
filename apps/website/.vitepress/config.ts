import { defineConfig } from 'vitepress';
import { version } from '../../../package.json';

export default defineConfig({
  title: 'Requesto',
  description: 'A lightweight, self-hosted API client',
  base: '/',
  srcDir: 'src',
  ignoreDeadLinks: [/localhost/],

  sitemap: {
    hostname: 'https://requesto.com.au',
  },

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo-blue.svg' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '48x48', href: '/favicon-48x48.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' }],
    ['meta', { name: 'theme-color', content: '#3b82f6' }],
    ['meta', { property: 'og:title', content: 'Requesto' }],
    ['meta', { property: 'og:description', content: 'A lightweight, self-hosted API client' }],
    ['meta', { property: 'og:type', content: 'website' }],
  ],

  themeConfig: {
    logo: {
      light: '/logo-blue.svg',
      dark: '/logo.svg',
    },

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Documentation', link: '/guide/introduction' },
      { text: 'Download', link: '/guide/download' },
      {
        text: `v${version}`,
        items: [{ text: 'Changelog', link: 'https://github.com/t3rr11/Requesto/releases' }],
      },
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What is Requesto?', link: '/guide/introduction' },
          { text: 'Download & Install', link: '/guide/download' },
          { text: 'Getting Started', link: '/guide/getting-started' },
        ],
      },
      {
        text: 'Deployment',
        items: [
          { text: 'Docker Deployment', link: '/deployment/docker' },
          { text: 'Desktop App', link: '/deployment/desktop' },
          { text: 'Building from Source', link: '/deployment/building' },
        ],
      },
      {
        text: 'Features',
        items: [
          { text: 'Workspaces', link: '/features/workspaces' },
          { text: 'Collections & Folders', link: '/features/collections' },
          { text: 'Environments', link: '/features/environments' },
          { text: 'Git Integration', link: '/features/git' },
          { text: 'OpenAPI Import & Sync', link: '/features/openapi' },
          { text: 'OAuth 2.0', link: '/features/oauth' },
          { text: 'Console & Logging', link: '/features/console' },
        ],
      },
      {
        text: 'Security',
        items: [{ text: 'Security', link: '/security' }],
      },
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/t3rr11/Requesto' }],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Matthew Allen',
    },

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/t3rr11/Requesto/edit/main/apps/website/src/:path',
      text: 'Edit this page on GitHub',
    },
  },
});
