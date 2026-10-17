<template>
  <div class="border-t border-gray mx-3 pb-4">
    <div class="pt-3 space-y-3">
      <p class="text-xs font-semibold text-dark/60 uppercase tracking-wide">KPI personnels partagés</p>

      <!-- Chargement -->
      <p v-if="!loaded" class="text-sm text-dark/60 italic">
        Chargement des KPI…
      </p>

      <!-- Pas de consentement -->
      <div v-else-if="kpi === null"
        class="rounded-xl border border-gray bg-light/40 px-4 py-3 text-sm text-dark/60 space-y-1">
        <p>Cet étudiant n'a pas encore partagé ses KPI personnels.</p>
        <p class="text-xs">Il peut vous accorder l'accès depuis l'onglet "Partage de mes KPI" dans sa vue étudiant.</p>
      </div>

      <!-- Données KPI -->
      <template v-else>
        <!-- Barre de synthèse -->
        <div class="grid grid-cols-3 gap-1 text-center">
          <div class="rounded-xl bg-light border border-gray px-2 py-2">
            <p class="text-lg font-bold text-primary">
              {{ kpi.revision.streakDays }}<span class="text-xs font-normal"> j</span>
            </p>
            <p class="text-xs text-dark/60 mt-0.5">Streak révision</p>
          </div>
          <div class="rounded-xl bg-light border border-gray px-2 py-2">
            <p class="text-lg font-bold" :class="disciplineScoreClass(kpi.discipline.disciplineScore)">
              {{ kpi.discipline.disciplineScore }}<span class="text-xs font-normal"> %</span>
            </p>
            <p class="text-xs text-dark/60 mt-0.5">Discipline 30j</p>
          </div>
          <div class="rounded-xl bg-light border border-gray px-2 py-2">
            <p class="text-lg font-bold text-primary">
              {{ kpi.leitner.mastery }}<span class="text-xs font-normal"> %</span>
            </p>
            <p class="text-xs text-dark/60 mt-0.5">Maîtrise Leitner</p>
          </div>
        </div>

        <!-- Révision -->
        <div class="rounded-xl border border-gray px-3 py-2 space-y-2">
          <p class="text-xs font-semibold text-primary uppercase tracking-wide">Révision</p>
          <div class="grid grid-cols-3 gap-1 text-xs">
            <span class="text-dark/60">Planifiées</span>
            <span class="text-dark/60">Complétées</span>
            <span class="text-dark/60">Taux</span>
            <span class="font-semibold">{{ kpi.revision.totalPlanned }}</span>
            <span class="font-semibold">{{ kpi.revision.totalCompleted }}</span>
            <span class="font-semibold">{{ kpi.revision.completionRate }} %</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-dark/60">30 jours (planifiées / complétées)</span>
            <span class="font-semibold">{{ kpi.revision.sessionsLast30Days }} / {{ kpi.revision.completedLast30Days }}</span>
          </div>
          <p class="text-xs text-dark/60">
            Streak : <span class="font-semibold text-dark">{{ kpi.revision.streakDays }} j</span>
            · Temps total : <span class="font-semibold text-dark">{{ formatMinutes(kpi.revision.totalMinutes) }}</span>
          </p>
          <!-- Activité hebdomadaire (mini-graphique barres) -->
          <div v-if="kpi.revision.weeklyActivity?.length" class="space-y-1">
            <p class="text-xs text-dark/60">Activité / semaine (8 sem.)</p>
            <div class="flex items-end gap-0.5 h-8">
              <div v-for="w in kpi.revision.weeklyActivity" :key="w.week"
                class="flex-1 rounded-sm bg-primary/60 transition-all"
                :style="{ height: weeklyBarHeight(w.count) }"
                :title="`Semaine du ${w.week} : ${w.count} séance(s) complétée(s)`">
              </div>
            </div>
          </div>
        </div>

        <!-- Exercices -->
        <div class="rounded-xl border border-gray px-3 py-2 space-y-2">
          <p class="text-xs font-semibold text-primary uppercase tracking-wide">Exercices</p>
          <div class="grid grid-cols-4 gap-1 text-xs">
            <span class="text-dark/60">Total</span>
            <span class="text-dark/60">Moy.</span>
            <span class="text-dark/60">Min / Max</span>
            <span class="text-dark/60">Tendance</span>
            <span class="font-semibold">{{ kpi.exercises.totalTests }}</span>
            <span class="font-semibold">{{ kpi.exercises.avgScore }} %</span>
            <span class="font-semibold">{{ kpi.exercises.minScore }} / {{ kpi.exercises.maxScore }} %</span>
            <span :class="['font-semibold', kpi.exercises.recentTrend > 0 ? 'text-success' : kpi.exercises.recentTrend < 0 ? 'text-secondary' : '']">
              {{ kpi.exercises.recentTrend > 0 ? '+' : '' }}{{ kpi.exercises.recentTrend ?? '—' }} %
            </span>
          </div>
          <!-- Dernières évaluations -->
          <div v-if="kpi.exercises.scoreHistory?.length" class="space-y-0.5 pt-1">
            <p class="text-xs text-dark/60">5 dernières évaluations</p>
            <div v-for="h in kpi.exercises.scoreHistory.slice(0, 5)" :key="h.date"
              class="flex justify-between text-xs">
              <span class="text-dark/70 truncate max-w-[120px]">{{ h.testName }}</span>
              <span :class="['font-semibold', h.percentage >= 70 ? 'text-success' : h.percentage >= 50 ? 'text-primary' : 'text-secondary']">
                {{ h.percentage }} %
              </span>
            </div>
          </div>
        </div>

        <!-- Leitner -->
        <div class="rounded-xl border border-gray px-3 py-2 space-y-2">
          <p class="text-xs font-semibold text-primary uppercase tracking-wide">Leitner</p>
          <p class="text-xs">
            <span class="text-dark/60">Cartes : </span><span class="font-semibold">{{ kpi.leitner.totalCards }}</span>
            <span class="text-dark/60"> · Maîtrise : </span><span class="font-semibold">{{ kpi.leitner.mastery }} %</span>
            <span class="text-dark/60"> · À réviser : </span><span class="font-semibold">{{ kpi.leitner.cardsDue }}</span>
            <span class="text-dark/60"> · Succès : </span><span class="font-semibold">{{ kpi.leitner.globalSuccessRate }} %</span>
          </p>
          <!-- Distribution par boîte -->
          <div v-if="kpi.leitner.totalCards > 0">
            <p class="text-xs text-dark/60 mb-1">Distribution par boîte</p>
            <div class="flex gap-1 text-center">
              <div v-for="box in 5" :key="box" class="flex-1">
                <div class="h-1.5 rounded-sm"
                  :class="box <= 2 ? 'bg-secondary/50' : box === 3 ? 'bg-primary/50' : 'bg-success/50'">
                </div>
                <p class="text-xs font-semibold text-dark/70 mt-0.5">{{ kpi.leitner.cardsByBox[box] ?? 0 }}</p>
                <p class="text-xs text-dark/40">B{{ box }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Matières étudiées -->
        <div v-if="kpi.subjects?.list?.length"
          class="rounded-xl border border-gray px-3 py-2 space-y-1">
          <p class="text-xs font-semibold text-primary uppercase tracking-wide">Matières étudiées</p>
          <div class="flex flex-wrap gap-1">
            <span v-for="sub in kpi.subjects.list" :key="sub.subjectId"
              class="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {{ sub.name }}
              <span class="text-primary/60 ml-0.5 text-xs">
                {{ [sub.systems > 0 ? `${sub.systems} syst.` : null, sub.tests > 0 ? `${sub.tests} exo` : null].filter(Boolean).join(' · ') }}
              </span>
            </span>
          </div>
        </div>

        <!-- Discipline -->
        <div class="rounded-xl border border-gray px-3 py-2 space-y-1">
          <p class="text-xs font-semibold text-primary uppercase tracking-wide">Discipline</p>
          <div class="grid grid-cols-2 gap-1 text-xs">
            <span class="text-dark/60">Cette semaine (planifiées / complétées)</span>
            <span class="font-semibold text-right">{{ kpi.discipline.plannedThisWeek }} / {{ kpi.discipline.completedThisWeek }}</span>
            <span class="text-dark/60">Score 30 jours</span>
            <span :class="['font-semibold text-right', disciplineScoreClass(kpi.discipline.disciplineScore)]">
              {{ kpi.discipline.disciplineScore }} %
            </span>
          </div>
        </div>

        <!-- Badges débloqués -->
        <div v-if="kpi.badges?.filter(b => b.unlocked).length"
          class="rounded-xl border border-gray px-3 py-2">
          <p class="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Badges débloqués</p>
          <div class="flex flex-wrap gap-2">
            <span v-for="b in kpi.badges.filter(b => b.unlocked)"
              :key="b.id"
              class="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
              :title="b.description">
              {{ b.icon }} {{ b.label }}
            </span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
// KPI personnels partagés par un étudiant (S-02.07) : synthèse, révision, exercices, Leitner, matières,
// discipline, badges. Extrait de pages/ClassroomEnseignantView.vue.
import { disciplineScoreClass, weeklyBarHeight, formatMinutes } from '@/helpers/classroomFormat'

defineProps({
  // Les KPI de l'étudiant ont-ils déjà été demandés ? (sinon : « Chargement des KPI… »)
  loaded: { type: Boolean, required: true },
  // null = l'étudiant n'a pas accordé l'accès à ses KPI personnels
  kpi: { type: Object, default: null },
})
</script>
