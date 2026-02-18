<script setup lang="ts">
import { useAiProvider } from '@/composables/useAiProvider'

const { settings } = useAiProvider()
</script>

<template>
  <div class="provider-info">
    <span class="label">AI Provider:</span>
    <span class="provider-name">
      {{ { puter: 'Puter.js (Free)', anthropic: 'Anthropic', openai: 'OpenAI', gemini: 'Google Gemini' }[settings.provider] }}
    </span>
    <span class="hint">Change in Settings</span>
  </div>
</template>

<style scoped>
.provider-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-muted);
  padding: 8px 0;
}

.label {
  font-weight: 600;
}

.provider-name {
  color: var(--color-accent);
  font-weight: 500;
}

.hint {
  font-size: 11px;
  opacity: 0.7;
}
</style>
