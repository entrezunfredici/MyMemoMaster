// Groupes classes où l'utilisateur connecté est enseignant : ce sont les seuls vers lesquels il peut
// assigner un exercice (liste « Assigner à des groupes » et section « Partager dans des groupes classes »).

import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useClassGroupStore } from '@/stores/classGroups'

export function useAssignableGroups() {
  const authStore = useAuthStore()
  const classGroupStore = useClassGroupStore()

  const assignableGroups = computed(() => {
    const userId = authStore.user?.userId
    return (classGroupStore.groups ?? []).filter((g) =>
      g.members?.some((m) => m.userId === userId && m.role === 'teacher'),
    )
  })

  const canAssignToGroups = computed(() => assignableGroups.value.length > 0)

  return { assignableGroups, canAssignToGroups }
}
