<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  fileSelected: [file: File]
}>()

const isDragging = ref(false)
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement>()

function handleDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file) selectFile(file)
}

function handleFileInput(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) selectFile(file)
}

function selectFile(file: File) {
  const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  if (!allowed.includes(file.type)) {
    alert('Please upload a PDF or DOCX file')
    return
  }
  selectedFile.value = file
  emit('fileSelected', file)
}

function triggerInput() {
  fileInput.value?.click()
}
</script>

<template>
  <div
    class="dropzone"
    :class="{ dragging: isDragging, 'has-file': selectedFile }"
    @dragover.prevent="isDragging = true"
    @dragleave="isDragging = false"
    @drop.prevent="handleDrop"
    @click="triggerInput"
  >
    <input
      ref="fileInput"
      type="file"
      accept=".pdf,.docx"
      hidden
      @change="handleFileInput"
    />
    <div v-if="selectedFile" class="file-info">
      <span class="file-icon">&#128196;</span>
      <span>{{ selectedFile.name }}</span>
    </div>
    <div v-else class="placeholder">
      <span class="upload-icon">&#8593;</span>
      <p><strong>Drop your CV here</strong> or click to browse</p>
      <p class="hint">PDF or DOCX, max 10 MB</p>
    </div>
  </div>
</template>

<style scoped>
.dropzone {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius);
  padding: 48px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--color-surface);
}

.dropzone:hover,
.dropzone.dragging {
  border-color: var(--color-accent);
  background: rgba(74, 158, 255, 0.03);
}

.dropzone.has-file {
  border-color: var(--color-success);
  border-style: solid;
}

.upload-icon {
  font-size: 32px;
  display: block;
  margin-bottom: 8px;
  color: var(--color-accent);
}

.placeholder p {
  margin: 4px 0;
  font-size: 14px;
}

.hint {
  color: var(--color-text-muted);
  font-size: 12px !important;
}

.file-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
}

.file-icon {
  font-size: 24px;
}
</style>
