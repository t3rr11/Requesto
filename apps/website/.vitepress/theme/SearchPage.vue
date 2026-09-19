<script setup lang="ts">
import MiniSearch from 'minisearch';
import { useData, useRouter } from 'vitepress';
import { onMounted, onUnmounted, ref, shallowRef, watch } from 'vue';
import localSearchIndex from '@localSearchIndex';

interface Result {
  id: string;
  title: string;
  titles: string[];
  score?: number;
}

const MAX_RESULTS = 12;

const { localeIndex } = useData();
const router = useRouter();

const query = ref('');
const input = ref<HTMLInputElement>();
const index = shallowRef<MiniSearch<Result>>();
const loaded = ref(false);
const results = ref<Result[]>([]);
const selectedIndex = ref(0);

const popular = [
  'Unit tests',
  'GraphQL',
  'Environments',
  'OAuth 2.0',
  'Docker',
  'Git sync',
];

// Reserve the scrollbar gutter while on this page so the layout
// doesn't shift horizontally as results appear/disappear
onMounted(() => {
  document.documentElement.classList.add('docs-search-page-root');
});

onUnmounted(() => {
  document.documentElement.classList.remove('docs-search-page-root');
});

onMounted(async () => {
  try {
    const localeIndexData = await (localSearchIndex as Record<
      string,
      () => Promise<{ default: string }>
    >)[localeIndex.value]?.();
    if (localeIndexData?.default) {
      index.value = await MiniSearch.loadJSON<Result>(localeIndexData.default, {
        fields: ['title', 'titles', 'text'],
        storeFields: ['title', 'titles'],
        searchOptions: {
          fuzzy: 0.2,
          prefix: true,
          boost: { title: 4, text: 2, titles: 1 },
        },
      });
      loaded.value = true;
      search(query.value);
    }
  } catch (error) {
    console.error('Failed to load search index', error);
  }
});

function search(term: string) {
  const trimmed = term.trim();
  if (!index.value || !trimmed) {
    results.value = [];
    selectedIndex.value = 0;
    return;
  }
  results.value = index.value.search(trimmed).slice(0, MAX_RESULTS) as Result[];
  selectedIndex.value = 0;
}

watch(query, (term) => search(term));

function goTo(result: Result) {
  router.go(result.id);
}

function onSubmit() {
  if (results.value.length > 0) {
    goTo(results.value[selectedIndex.value] ?? results.value[0]);
  }
}

function clear() {
  query.value = '';
  input.value?.focus();
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    if (results.value.length) {
      selectedIndex.value = (selectedIndex.value + 1) % results.value.length;
    }
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (results.value.length) {
      selectedIndex.value =
        (selectedIndex.value - 1 + results.value.length) % results.value.length;
    }
  } else if (event.key === 'Escape') {
    clear();
  }
}
</script>

<template>
  <div class="docs-search">
    <img class="docs-search-logo" src="/logo-blue.svg" alt="Requesto logo" />

    <h1 class="docs-search-heading">Requesto Docs</h1>
    <p class="docs-search-tagline">What can we help you find?</p>

    <form class="docs-search-box" role="search" @submit.prevent="onSubmit">
      <svg
        class="docs-search-icon"
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        ref="input"
        v-model="query"
        type="search"
        placeholder="Search the docs… e.g. “Unit tests” or “GraphQL”"
        aria-label="Search documentation"
        autocomplete="off"
        spellcheck="false"
        autofocus
        @keydown="onKeydown"
      />
      <button type="submit" :disabled="!results.length">Search</button>
    </form>

    <ul v-if="results.length" class="docs-search-results">
      <li v-for="(result, i) in results" :key="result.id">
        <a
          :href="result.id"
          class="docs-search-result"
          :class="{ selected: i === selectedIndex }"
          @mouseenter="selectedIndex = i"
          @click="goTo(result)"
        >
          <span class="docs-search-result-icon">#</span>
          <span class="docs-search-result-body">
            <span v-if="result.titles.length" class="docs-search-result-titles">
              {{ result.titles.join(' › ') }} ›
            </span>
            <span class="docs-search-result-title">{{ result.title }}</span>
          </span>
        </a>
      </li>
    </ul>

    <p
      v-else-if="query.trim() && loaded"
      class="docs-search-empty"
    >
      No results for “{{ query.trim() }}”
    </p>

    <div v-if="!query.trim()" class="docs-search-popular">
      <span>Popular:</span>
      <button
        v-for="term in popular"
        :key="term"
        type="button"
        @click="query = term"
      >
        {{ term }}
      </button>
    </div>

    <p class="docs-search-hint">
      Tip: press <kbd>Ctrl</kbd><kbd>K</kbd> or <kbd>/</kbd> anywhere on the
      site to open search.
    </p>
  </div>
</template>
