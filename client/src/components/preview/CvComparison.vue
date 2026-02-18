<script setup lang="ts">
import type { CVProfile } from '../../../../shared/types'
import CvPreview from './CvPreview.vue'

defineProps<{
  original: CVProfile
  tailored: CVProfile
}>()
</script>

<template>
  <div class="comparison">
    <CvPreview :profile="original" label="Original" />
    <CvPreview :profile="tailored" label="Tailored" />
  </div>
</template>

<style scoped>
.comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 768px) {
  .comparison {
    grid-template-columns: 1fr;
  }
}
</style>
