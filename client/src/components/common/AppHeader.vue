<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import SettingsPanel from './SettingsPanel.vue'

const showSettings = ref(false)
</script>

<template>
  <header class="app-header">
    <div class="header-inner container">
      <RouterLink to="/" class="logo">CV Tailor</RouterLink>
      <nav>
        <RouterLink to="/">Jobs</RouterLink>
        <RouterLink to="/upload">Upload CV</RouterLink>
        <RouterLink to="/tailor">Tailor</RouterLink>
        <RouterLink to="/preview">Preview</RouterLink>
        <RouterLink to="/applications">Bewerbungen</RouterLink>
        <RouterLink to="/dashboard">Dashboard</RouterLink>
      </nav>
      <button class="btn btn-sm btn-secondary" @click="showSettings = true">Settings</button>
    </div>
    <SettingsPanel v-if="showSettings" @close="showSettings = false" />
  </header>
</template>

<style scoped>
.app-header {
  background: var(--color-primary);
  color: white;
  padding: 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-inner {
  display: flex;
  align-items: center;
  gap: 32px;
  height: 56px;
}

.logo {
  font-size: 18px;
  font-weight: 700;
  color: white;
  text-decoration: none;
}

.logo:hover {
  text-decoration: none;
  color: var(--color-accent);
}

nav {
  display: flex;
  gap: 20px;
  flex: 1;
}

nav a {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  padding: 4px 0;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

nav a:hover,
nav a.router-link-active {
  color: white;
  text-decoration: none;
  border-bottom-color: var(--color-accent);
}
</style>
