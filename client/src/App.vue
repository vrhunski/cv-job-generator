<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'
import { migrateFromLocalStorage } from '@/utils/migrateFromLocalStorage'
import { useProfile } from '@/composables/useProfile'
import { useApplications } from '@/composables/useApplications'

const { fetchProfile } = useProfile()
const { fetchApplications } = useApplications()

onMounted(async () => {
  await migrateFromLocalStorage()
  // Always re-fetch after migration: module-level fetchProfile() ran before
  // migration completed, so reactive state needs refreshing.
  await Promise.all([fetchProfile(), fetchApplications()])
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
