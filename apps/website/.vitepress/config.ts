import { defineConfig, type PageData } from 'vitepress';
import llmstxt from 'vitepress-plugin-llms';
import { version } from '../../../package.json';

const SITE_URL = 'https://requesto.com.au';

export default defineConfig({
  title: 'Requesto',
  description: 'A lightweight, self-hosted API client. No accounts, no cloud, no telemetry. Run it locally or self-host with Docker.',
  base: '/',
  srcDir: 'src',
  ignoreDeadLinks: [/localhost/],

  sitemap: {
    hostname: SITE_URL,
  },

  vite: {
    // @ts-expect-error - monorepo Vite version mismatch: plugin resolves root Vite 8 types, VitePress bundles Vite 5
    plugins: [llmstxt()],
  },

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo-blue.svg' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '48x48', href: '/favicon-48x48.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' }],
    ['meta', { name: 'theme-color', content: '#3b82f6' }],
    // Open Graph
    ['meta', { property: 'og:site_name', content: 'Requesto' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:image', content: `${SITE_URL}/og-image.png` }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { property: 'og:image:alt', content: 'Requesto — self-hosted API client' }],
    // Twitter Card
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: `${SITE_URL}/og-image.png` }],
    // JSON-LD: Organization
    ['script', { type: 'application/ld+json' }, JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Requesto',
      url: SITE_URL,
      logo: `${SITE_URL}/logo-blue.svg`,
      sameAs: ['https://github.com/t3rr11/Requesto'],
    })],
  ],

  transformPageData(pageData: PageData) {
    const { title, description, relativePath } = pageData;
    const pageTitle = title ? `${title} | Requesto` : 'Requesto';
    const pageDesc = description || 'A lightweight, self-hosted API client. No accounts, no cloud, no telemetry.';
    const canonicalPath = relativePath.replace(/\.md$/, '').replace(/\/index$/, '/');
    const canonicalUrl = `${SITE_URL}/${canonicalPath}`;

    pageData.frontmatter.head ??= [];
    pageData.frontmatter.head.push(
      ['link', { rel: 'canonical', href: canonicalUrl }],
      ['meta', { property: 'og:title', content: pageTitle }],
      ['meta', { property: 'og:description', content: pageDesc }],
      ['meta', { property: 'og:url', content: canonicalUrl }],
      ['meta', { name: 'twitter:title', content: pageTitle }],
      ['meta', { name: 'twitter:description', content: pageDesc }],
    );

    // BreadcrumbList JSON-LD (skip for homepage)
    const segments = canonicalPath.replace(/\/$/, '').split('/').filter(Boolean);
    if (segments.length > 0) {
      const items = [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        ...segments.map((seg, i) => ({
          '@type': 'ListItem',
          position: i + 2,
          name: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '),
          item: `${SITE_URL}/${segments.slice(0, i + 1).join('/')}`,
        })),
      ];
      pageData.frontmatter.head.push(
        ['script', { type: 'application/ld+json' }, JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: items,
        })],
      );
    }
  },

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
