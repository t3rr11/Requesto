# Requesto Website

VitePress-powered documentation and marketing website for Requesto.

## Development

```bash
npm run docs:dev
```

Access at [http://localhost:5173](http://localhost:5173)

## Building

```bash
npm run docs:build
```

Output: `website/.vitepress/dist/`

## Preview Production Build

```bash
npm run docs:preview
```

## Deployment

The website is automatically deployed to GitHub Pages when a new release is published.

Manual deployment:
```bash
npm run docs:build
# Upload contents of website/.vitepress/dist/ to your hosting
```

## Structure

```
website/
├── .vitepress/
│   ├── config.ts         # VitePress configuration
│   └── theme/            # Custom theme
├── index.md              # Home page
├── getting-started.md    # Getting started guide
├── download.md           # Download page
├── features/             # Feature documentation
│   ├── collections.md
│   ├── environments.md
│   ├── oauth.md
│   └── history.md
└── deployment.md         # Deployment guides
```

## Customization

### Config

Edit `.vitepress/config.ts` to customize:
- Site title and description
- Navigation and sidebar
- Social links
- Search settings

### Theme

Edit `.vitepress/theme/custom.css` for:
- Brand colors
- Component styling
- Custom CSS

### Content

Markdown files in root and subdirectories become pages.

## Adding Pages

1. Create new `.md` file
2. Add frontmatter if needed:
   ```yaml
   ---
   title: Page Title
   description: Page description
   ---
   ```
3. Update sidebar in `.vitepress/config.ts`

## GitHub Pages Setup

1. Go to repository Settings → Pages
2. Source: GitHub Actions
3. The workflow will deploy on each release

Base path is configured in `config.ts`:
```ts
base: '/Requesto/'  // Change to '/' if using custom domain
```
