<script setup lang="ts">
const props = defineProps<{
  tags: string[]
  removable?: boolean
}>()

const emit = defineEmits<{
  remove: [index: number]
  add: [tag: string]
}>()

function handleKeydown(e: KeyboardEvent) {
  const input = e.target as HTMLInputElement
  if (e.key === 'Enter' && input.value.trim()) {
    emit('add', input.value.trim())
    input.value = ''
  }
}
</script>

<template>
  <div class="tag-chips">
    <span
      v-for="(tag, i) in tags"
      :key="i"
      class="chip"
    >
      {{ tag }}
      <button v-if="removable" class="remove" @click="emit('remove', i)">&times;</button>
    </span>
    <input
      v-if="removable"
      class="chip-input"
      placeholder="Add..."
      @keydown="handleKeydown"
    />
  </div>
</template>

<style scoped>
.tag-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  background: rgba(74, 158, 255, 0.1);
  color: var(--color-accent);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.remove {
  background: none;
  border: none;
  color: var(--color-accent);
  font-size: 14px;
  padding: 0;
  line-height: 1;
  cursor: pointer;
  opacity: 0.6;
}

.remove:hover {
  opacity: 1;
}

.chip-input {
  border: none;
  outline: none;
  font-size: 12px;
  padding: 3px 6px;
  min-width: 80px;
  background: transparent;
}
</style>
