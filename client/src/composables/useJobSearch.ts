import { ref } from 'vue'
import type { JobListing } from '../../../shared/types'

// Singleton: persists across route changes so TailoringView can read it
const selectedJob = ref<JobListing | null>(null)

export function useJobSearch() {
  function selectJob(job: JobListing) {
    selectedJob.value = job
  }

  function clearJob() {
    selectedJob.value = null
  }

  return { selectedJob, selectJob, clearJob }
}
