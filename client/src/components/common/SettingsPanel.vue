<script setup lang="ts">
import { useAiProvider } from '@/composables/useAiProvider'

const emit = defineEmits<{ close: [] }>()
const { settings, updateSettings } = useAiProvider()
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="panel card">
      <div class="panel-header">
        <h3>Settings</h3>
        <button class="close-btn" @click="emit('close')">&times;</button>
      </div>

      <div class="form-group">
        <label>AI Provider</label>
        <select :value="settings.provider" @change="updateSettings({ provider: ($event.target as HTMLSelectElement).value as any })">
          <option value="gemini">Google Gemini (Free tier available)</option>
          <option value="puter">Puter.js (Free, no key needed)</option>
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="openai">OpenAI (GPT)</option>
        </select>
      </div>

      <template v-if="settings.provider === 'anthropic'">
        <div class="form-group">
          <label>Anthropic API Key</label>
          <input
            type="password"
            :value="settings.anthropicKey"
            placeholder="sk-ant-..."
            @input="updateSettings({ anthropicKey: ($event.target as HTMLInputElement).value })"
          />
        </div>
        <div class="form-group">
          <label>Model</label>
          <select :value="settings.anthropicModel" @change="updateSettings({ anthropicModel: ($event.target as HTMLSelectElement).value })">
            <option value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5</option>
            <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
          </select>
        </div>
      </template>

      <template v-if="settings.provider === 'openai'">
        <div class="form-group">
          <label>OpenAI API Key</label>
          <input
            type="password"
            :value="settings.openaiKey"
            placeholder="sk-..."
            @input="updateSettings({ openaiKey: ($event.target as HTMLInputElement).value })"
          />
        </div>
        <div class="form-group">
          <label>Model</label>
          <select :value="settings.openaiModel" @change="updateSettings({ openaiModel: ($event.target as HTMLSelectElement).value })">
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4o-mini">GPT-4o Mini</option>
          </select>
        </div>
      </template>

      <template v-if="settings.provider === 'gemini'">
        <div class="form-group">
          <label>Gemini API Key</label>
          <input
            type="password"
            :value="settings.geminiKey"
            placeholder="AIza..."
            @input="updateSettings({ geminiKey: ($event.target as HTMLInputElement).value })"
          />
          <small class="hint">Free at <a href="https://aistudio.google.com/apikey" target="_blank">aistudio.google.com/apikey</a></small>
        </div>
        <div class="form-group">
          <label>Model</label>
          <select :value="settings.geminiModel" @change="updateSettings({ geminiModel: ($event.target as HTMLSelectElement).value })">
            <option value="gemini-2.0-flash">Gemini 2.0 Flash (Free)</option>
            <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite (Free)</option>
            <option value="gemini-1.5-flash">Gemini 1.5 Flash (Free)</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
          </select>
        </div>
      </template>

      <template v-if="settings.provider === 'puter'">
        <p class="provider-note">Free &amp; unlimited via Puter.js — no API key needed. Uses a "user-pays" model where each user covers their own usage.</p>
        <div class="form-group">
          <label>Puter Model</label>
          <select :value="settings.puterModel" @change="updateSettings({ puterModel: ($event.target as HTMLSelectElement).value })">
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4o-mini">GPT-4o Mini</option>
            <option value="o3-mini">o3-mini</option>
            <option value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5</option>
          </select>
        </div>
      </template>

      <button class="btn btn-primary" style="width: 100; margin-top: 12px" @click="emit('close')">Done</button>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: flex-end;
  z-index: 200;
}

.panel {
  width: 380px;
  height: 100vh;
  border-radius: 0;
  overflow-y: auto;
  padding: 24px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.panel-header h3 {
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--color-text-muted);
  cursor: pointer;
}

.provider-note {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 12px;
  line-height: 1.5;
}

.hint {
  display: block;
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 4px;
}

.hint a {
  color: var(--color-accent);
}
</style>
