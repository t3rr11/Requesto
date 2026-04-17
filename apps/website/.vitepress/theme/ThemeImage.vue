<script setup lang="ts">
import { withBase } from 'vitepress'

const props = defineProps<{
  src: string
  alt: string
}>()
</script>

<template>
  <img
    class="theme-image light-only"
    :src="withBase(`/screenshots/light${props.src}`)"
    :alt="props.alt"
  />
  <img
    class="theme-image dark-only"
    :src="withBase(`/screenshots/dark${props.src}`)"
    :alt="props.alt"
  />
</template>

<style scoped>
.dark-only {
  display: none;
}

html.dark .dark-only {
  display: block;
}

html.dark .light-only {
  display: none;
}
</style>
