import { ref, computed } from 'vue'
import type { Suggestion } from '../../../shared/types'

const suggestions = ref<Suggestion[]>([])
const activeFilter = ref<'all' | 'high' | 'medium' | 'low'>('all')

export function useSuggestions() {
  const filtered = computed(() => {
    if (activeFilter.value === 'all') return suggestions.value
    return suggestions.value.filter((s) => s.impact === activeFilter.value)
  })

  const approvedCount = computed(() =>
    suggestions.value.filter((s) => s.status === 'approved').length
  )

  const totalCount = computed(() => suggestions.value.length)

  const highCount = computed(() =>
    suggestions.value.filter((s) => s.impact === 'high').length
  )

  function setSuggestions(items: Suggestion[]) {
    suggestions.value = items.map((s, i) => ({
      ...s,
      id: s.id || `sug-${i}`,
      status: s.status || 'pending',
    }))
  }

  function approveSuggestion(id: string) {
    const s = suggestions.value.find((s) => s.id === id)
    if (s) s.status = s.status === 'approved' ? 'pending' : 'approved'
  }

  function rejectSuggestion(id: string) {
    const s = suggestions.value.find((s) => s.id === id)
    if (s) s.status = s.status === 'rejected' ? 'pending' : 'rejected'
  }

  function setFilter(f: 'all' | 'high' | 'medium' | 'low') {
    activeFilter.value = f
  }

  function getApproved(): Suggestion[] {
    return suggestions.value.filter((s) => s.status === 'approved')
  }

  return {
    suggestions,
    filtered,
    activeFilter,
    approvedCount,
    totalCount,
    highCount,
    setSuggestions,
    approveSuggestion,
    rejectSuggestion,
    setFilter,
    getApproved,
  }
}
