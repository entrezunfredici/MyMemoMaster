<template>
  <div class="border-t border-gray/80 px-3 pb-3 pt-2 text-xs text-dark/60 space-y-3">

    <!-- Informations de base -->
    <div class="space-y-1">
      <p>Email : <span class="text-dark/80">{{ student.email || '—' }}</span></p>
      <p>
        Dernière activité :
        <span v-if="student.lastActivityAt" class="text-dark/80">
          {{ formatDate(student.lastActivityAt) }}
          <span class="text-dark/40">(il y a {{ student.daysInactive }}j)</span>
        </span>
        <span v-else>aucune</span>
      </p>
      <p>
        Score moyen :
        <span
          :class="student.avgScore !== null ? scoreTextClass(student.avgScore) : 'text-dark/40'"
          class="font-semibold">
          {{ student.avgScore !== null ? student.avgScore + ' %' : '—' }}
        </span>
      </p>
    </div>

    <!-- Alertes décrochage -->
    <div v-if="student.atRisk && student.atRiskReasons.length">
      <p class="font-medium text-secondary mb-1">Alertes :</p>
      <div class="flex flex-wrap gap-1">
        <span
          v-for="reason in student.atRiskReasons"
          :key="reason"
          class="rounded-full bg-secondary/10 px-2 py-0.5 text-secondary">
          {{ reason }}
        </span>
      </div>
    </div>

    <!-- Historique des scores -->
    <div>
      <p class="font-medium text-dark/80 mb-1">Historique des exercices :</p>
      <div v-if="student.scoreTrend && student.scoreTrend.length" class="flex flex-wrap gap-2">
        <div
          v-for="(entry, i) in student.scoreTrend"
          :key="i"
          class="rounded-xl border border-gray bg-light px-2 py-1 text-center min-w-[56px]">
          <p :class="['font-semibold', scoreTextClass(entry.score)]">{{ entry.score }} %</p>
          <p class="text-dark/40 text-[10px]">{{ formatDate(entry.completedAt) }}</p>
        </div>
      </div>
      <p v-else class="text-dark/40">Aucun exercice complété.</p>
    </div>

  </div>
</template>

<script setup>
defineProps({
  student: { type: Object, required: true }
})

function scoreTextClass(score) {
  if (score >= 70) return 'text-success'
  if (score >= 50) return 'text-dark'
  return 'text-secondary'
}

function formatDate(value) {
  if (!value) return '—'
  const datePart = value.substring(0, 10)
  const [, month, day] = datePart.split('-').map(Number)
  const months = ['jan.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sep.', 'oct.', 'nov.', 'déc.']
  return `${day} ${months[month - 1]}`
}
</script>
