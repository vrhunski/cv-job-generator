<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'
import { migrateFromLocalStorage } from '@/utils/migrateFromLocalStorage'

onMounted(async () => {
  await migrateFromLocalStorage()
})
</script>

<template>
  <AppHeader />
  <main class="container">
    <RouterView />
  </main>
</template>

<style scoped>
main {
  padding-top: 24px;
  padding-bottom: 48px;
}
</style>
