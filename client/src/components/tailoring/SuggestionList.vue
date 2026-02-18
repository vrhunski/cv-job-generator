<script setup lang="ts">
import { useSuggestions } from '@/composables/useSuggestions'
import SuggestionCard from './SuggestionCard.vue'

const {
  filtered,
  activeFilter,
  approvedCount,
  totalCount,
  highCount,
  setFilter,
  approveSuggestion,
  rejectSuggestion,
} = useSuggestions()

const filters: Array<{ key: 'all' | 'high' | 'medium' | 'low'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
]
</script>

<template>
  <div class="suggestion-list">
    <div class="list-header">
      <div class="stats">
        <strong>{{ totalCount }} suggestions</strong>
        <span class="muted"> — {{ highCount }} high impact</span>
      </div>
      <div class="counter">{{ approvedCount }}/{{ totalCount }} approved</div>
    </div>

    <div class="filter-tabs">
      <button
        v-for="f in filters"
        :key="f.key"
        class="tab"
        :class="{ active: activeFilter === f.key }"
        @click="setFilter(f.key)"
      >
        {{ f.label }}
      </button>
    </div>

    <div class="cards">
      <SuggestionCard
        v-for="s in filtered"
        :key="s.id"
        :suggestion="s"
        @approve="approveSuggestion"
        @reject="rejectSuggestion"
      />
      <p v-if="filtered.length === 0" class="empty">No suggestions in this category.</p>
    </div>
  </div>
</template>

<style scoped>
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.muted {
  color: var(--color-text-muted);
  font-size: 13px;
}

.counter {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-accent);
}

.filter-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
}

.tab {
  padding: 6px 14px;
  border: 1px solid var(--color-border);
  border-radius: 20px;
  background: var(--color-surface);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.tab.active {
  background: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
}

.cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty {
  text-align: center;
  color: var(--color-text-muted);
  padding: 24px;
}
</style>
