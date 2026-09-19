import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import mediumZoom from 'medium-zoom';
import { onMounted, watch, nextTick } from 'vue';
import { useRoute } from 'vitepress';
import ThemeImage from './ThemeImage.vue';
import SearchPage from './SearchPage.vue';
import { initOpenObserve } from './openobserve';
import './custom.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ThemeImage', ThemeImage);
    app.component('SearchPage', SearchPage);
  },
  setup() {
    initOpenObserve();
    const route = useRoute();

    const initZoom = () => {
      mediumZoom('.vp-doc img', { background: 'var(--vp-c-bg)' });
    };

    onMounted(() => {
      initZoom();
    });

    watch(
      () => route.path,
      () => nextTick(() => initZoom())
    );
  },
} satisfies Theme;
