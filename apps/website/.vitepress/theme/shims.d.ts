declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '*.css' {}

interface ImportMetaEnv {
  readonly OO_SITE?: string;
  readonly OO_CLIENT_TOKEN?: string;
  readonly OO_ORGANIZATION_ID?: string;
  readonly OO_ENVIRONMENT?: string;
}
