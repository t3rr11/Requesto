import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Requesto',
  description: 'A lightweight, self-hosted API client',
  base: '/Requesto/',

  head: [
    ['link', { rel: 'icon', href: '/Requesto/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#3b82f6' }],
    ['meta', { property: 'og:title', content: 'Requesto' }],
    ['meta', { property: 'og:description', content: 'A lightweight, self-hosted API client' }],
    ['meta', { property: 'og:type', content: 'website' }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Documentation', link: '/getting-started' },
      { text: 'Download', link: '/download' },
      {
        text: 'v1.0.0',
        items: [
          { text: 'Changelog', link: 'https://github.com/t3rr11/Requesto/releases' },
          { text: 'Contributing', link: '/building.html#contributing' },
        ],
      },
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What is Requesto?', link: '/introduction' },
          { text: 'Download & Install', link: '/download' },
          { text: 'Getting Started', link: '/getting-started' },
        ],
      },
      {
        text: 'Deployment',
        items: [
          { text: 'Docker Deployment', link: '/deployment' },
          { text: 'Desktop App', link: '/desktop' },
          { text: 'Building from Source', link: '/building' },
        ],
      },
      {
        text: 'Features',
        items: [
          { text: 'Collections & Folders', link: '/features/collections' },
          { text: 'Environments', link: '/features/environments' },
          { text: 'OAuth 2.0', link: '/features/oauth' },
          { text: 'Request History', link: '/features/history' },
        ],
      },
      {
        text: 'Security',
        items: [{ text: 'Security Compliance', link: '/security' }],
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
      pattern: 'https://github.com/t3rr11/Requesto/edit/main/website/:path',
      text: 'Edit this page on GitHub',
    },
  },
});
