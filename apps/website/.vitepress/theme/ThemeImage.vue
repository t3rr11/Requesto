<script setup lang="ts">
import { useData, withBase } from 'vitepress'

const props = defineProps<{
  src: string
  alt: string
}>()

const { isDark } = useData()
</script>

<template>
  <img
    :src="withBase(isDark ? `/screenshots/dark${props.src}` : `/screenshots/light${props.src}`)"
    :alt="props.alt"
  />
</template>
