<template>
  <div class="space-y-6">

    <!-- Sélection du groupe -->
    <div class="flex gap-3 overflow-x-auto pb-1">
      <div
        v-for="g in groups" :key="g.id"
        @click="selectGroup(g.id)"
        :class="[selectedId === g.id ? 'border-primary bg-light/70' : 'border-gray', 'min-w-[220px] cursor-pointer rounded-xl border-2 p-3 shadow-sm transition hover:-translate-y-0.5']">
        <p class="text-xs text-dark/60 uppercase tracking-wide">{{ g.level }}</p>
        <p class="text-lg font-semibold text-primary">{{ g.name }}</p>
        <p class="text-xs text-dark/60">{{ g.members?.length ?? 0 }} membres</p>
      </div>
      <p v-if="groups.length === 0" class="text-sm text-dark/60">Aucun groupe.</p>
    </div>

    <template v-if="currentGroup">
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">

        <!-- Colonne principale -->
        <div class="space-y-4 lg:col-span-2">

          <!-- KPI pédagogiques -->
          <section class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-dark">Analyse pédagogique</h2>
              <button @click="loadStudentAnalytics(selectedId)"
                class="rounded-lg border border-gray px-2 py-1 text-xs text-primary hover:bg-light transition">
                Actualiser
              </button>
            </div>
            <div v-if="analyticsLoading" class="py-4 text-center text-sm text-dark/60">Chargement...</div>
            <template v-else-if="analytics">
              <div class="grid grid-cols-3 gap-2 text-center">
                <div class="rounded-xl border border-gray bg-light p-3">
                  <p class="text-2xl font-bold text-success">{{ analytics.activeStudentsCount }}</p>
                  <p class="mt-1 text-xs text-dark/60">Actifs (7j)</p>
                </div>
                <div :class="['rounded-xl border p-3', analytics.atRiskCount > 0 ? 'border-secondary/40 bg-secondary/5' : 'border-gray bg-light']">
                  <p class="text-2xl font-bold" :class="analytics.atRiskCount > 0 ? 'text-secondary' : 'text-success'">{{ analytics.atRiskCount }}</p>
                  <p class="mt-1 text-xs text-dark/60">À risque</p>
                </div>
                <div class="rounded-xl border border-gray bg-light p-3">
                  <p class="text-2xl font-bold" :class="currentWeekScore !== null ? scoreTextClass(currentWeekScore) : 'text-dark/40'">
                    {{ currentWeekScore !== null ? currentWeekScore + ' %' : '—' }}
                  </p>
                  <p class="mt-1 text-xs text-dark/60">Score semaine</p>
                </div>
              </div>

              <!-- Alertes décrochage -->
              <div v-if="atRiskStudents.length > 0" class="space-y-2">
                <p class="text-sm font-medium text-secondary">Alertes décrochage ({{ atRiskStudents.length }})</p>
                <div v-for="s in atRiskStudents" :key="s.userId" class="rounded-xl border border-secondary/30 bg-secondary/5 px-3 py-2">
                  <p class="text-sm font-semibold text-dark">{{ s.name }}</p>
                  <div class="mt-1 flex flex-wrap gap-1">
                    <span v-for="r in s.atRiskReasons" :key="r" class="rounded-full bg-secondary/10 px-2 py-0.5 text-xs text-secondary">{{ r }}</span>
                  </div>
                </div>
              </div>

              <!-- Liste étudiants -->
              <div v-if="analytics.students.length > 0" class="space-y-2">
                <p class="text-sm font-medium text-dark/80">Étudiants ({{ analytics.students.length }})</p>
                <div v-for="s in analytics.students" :key="s.userId"
                  :class="['rounded-xl border transition cursor-pointer', expandedAnalyticsStudents[s.userId] ? 'border-primary bg-light/50' : 'border-gray']"
                  @click="toggleStudentAndLoadKpis(s.userId)">
                  <div class="flex items-center justify-between px-3 py-2">
                    <div class="flex items-center gap-2">
                      <span :class="['rounded-full px-2 py-0.5 text-xs font-semibold', s.atRisk ? 'bg-secondary/10 text-secondary' : 'bg-success/10 text-success']">
                        {{ s.atRisk ? '⚠ Risque' : '✓ OK' }}
                      </span>
                      <span class="text-sm font-semibold text-dark">{{ s.name }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <!-- Badge consentement KPI (visible après premier chargement) -->
                      <span v-if="s.userId in kpiConsentStore.studentKpis"
                        :class="[
                          'rounded-full px-2 py-0.5 text-xs font-semibold',
                          kpiConsentStore.studentKpis[s.userId] ? 'bg-success/10 text-success' : 'bg-gray text-dark/40'
                        ]">
                        {{ kpiConsentStore.studentKpis[s.userId] ? 'KPI ✓' : 'KPI —' }}
                      </span>
                      <span :class="['text-xs', s.avgScore !== null ? scoreTextClass(s.avgScore) : 'text-dark/40']">
                        {{ s.avgScore !== null ? s.avgScore + ' %' : '—' }}
                      </span>
                    </div>
                  </div>
                  <StudentDetailComponent v-if="expandedAnalyticsStudents[s.userId]" :student="s" />
                  <!-- Panneau KPI personnels partagés — S-02.07 -->
                  <div v-if="expandedAnalyticsStudents[s.userId]" class="border-t border-gray mx-3 pb-4">
                    <div class="pt-3 space-y-3">
                      <p class="text-xs font-semibold text-dark/60 uppercase tracking-wide">KPI personnels partagés</p>

                      <!-- Chargement -->
                      <p v-if="!(s.userId in kpiConsentStore.studentKpis)" class="text-sm text-dark/60 italic">
                        Chargement des KPI…
                      </p>

                      <!-- Pas de consentement -->
                      <div v-else-if="kpiConsentStore.studentKpis[s.userId] === null"
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
                              {{ studentKpi(s.userId).revision.streakDays }}<span class="text-xs font-normal"> j</span>
                            </p>
                            <p class="text-xs text-dark/60 mt-0.5">Streak révision</p>
                          </div>
                          <div class="rounded-xl bg-light border border-gray px-2 py-2">
                            <p class="text-lg font-bold" :class="disciplineScoreClass(studentKpi(s.userId).discipline.disciplineScore)">
                              {{ studentKpi(s.userId).discipline.disciplineScore }}<span class="text-xs font-normal"> %</span>
                            </p>
                            <p class="text-xs text-dark/60 mt-0.5">Discipline 30j</p>
                          </div>
                          <div class="rounded-xl bg-light border border-gray px-2 py-2">
                            <p class="text-lg font-bold text-primary">
                              {{ studentKpi(s.userId).leitner.mastery }}<span class="text-xs font-normal"> %</span>
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
                            <span class="font-semibold">{{ studentKpi(s.userId).revision.totalPlanned }}</span>
                            <span class="font-semibold">{{ studentKpi(s.userId).revision.totalCompleted }}</span>
                            <span class="font-semibold">{{ studentKpi(s.userId).revision.completionRate }} %</span>
                          </div>
                          <div class="flex justify-between text-xs">
                            <span class="text-dark/60">30 jours (planifiées / complétées)</span>
                            <span class="font-semibold">{{ studentKpi(s.userId).revision.sessionsLast30Days }} / {{ studentKpi(s.userId).revision.completedLast30Days }}</span>
                          </div>
                          <p class="text-xs text-dark/60">
                            Streak : <span class="font-semibold text-dark">{{ studentKpi(s.userId).revision.streakDays }} j</span>
                            · Temps total : <span class="font-semibold text-dark">{{ formatMinutes(studentKpi(s.userId).revision.totalMinutes) }}</span>
                          </p>
                          <!-- Activité hebdomadaire (mini-graphique barres) -->
                          <div v-if="studentKpi(s.userId).revision.weeklyActivity?.length" class="space-y-1">
                            <p class="text-xs text-dark/60">Activité / semaine (8 sem.)</p>
                            <div class="flex items-end gap-0.5 h-8">
                              <div v-for="w in studentKpi(s.userId).revision.weeklyActivity" :key="w.week"
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
                            <span class="font-semibold">{{ studentKpi(s.userId).exercises.totalTests }}</span>
                            <span class="font-semibold">{{ studentKpi(s.userId).exercises.avgScore }} %</span>
                            <span class="font-semibold">{{ studentKpi(s.userId).exercises.minScore }} / {{ studentKpi(s.userId).exercises.maxScore }} %</span>
                            <span :class="['font-semibold', studentKpi(s.userId).exercises.recentTrend > 0 ? 'text-success' : studentKpi(s.userId).exercises.recentTrend < 0 ? 'text-secondary' : '']">
                              {{ studentKpi(s.userId).exercises.recentTrend > 0 ? '+' : '' }}{{ studentKpi(s.userId).exercises.recentTrend ?? '—' }} %
                            </span>
                          </div>
                          <!-- Dernières évaluations -->
                          <div v-if="studentKpi(s.userId).exercises.scoreHistory?.length" class="space-y-0.5 pt-1">
                            <p class="text-xs text-dark/60">5 dernières évaluations</p>
                            <div v-for="h in studentKpi(s.userId).exercises.scoreHistory.slice(0, 5)" :key="h.date"
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
                            <span class="text-dark/60">Cartes : </span><span class="font-semibold">{{ studentKpi(s.userId).leitner.totalCards }}</span>
                            <span class="text-dark/60"> · Maîtrise : </span><span class="font-semibold">{{ studentKpi(s.userId).leitner.mastery }} %</span>
                            <span class="text-dark/60"> · À réviser : </span><span class="font-semibold">{{ studentKpi(s.userId).leitner.cardsDue }}</span>
                            <span class="text-dark/60"> · Succès : </span><span class="font-semibold">{{ studentKpi(s.userId).leitner.globalSuccessRate }} %</span>
                          </p>
                          <!-- Distribution par boîte -->
                          <div v-if="studentKpi(s.userId).leitner.totalCards > 0">
                            <p class="text-xs text-dark/60 mb-1">Distribution par boîte</p>
                            <div class="flex gap-1 text-center">
                              <div v-for="box in 5" :key="box" class="flex-1">
                                <div class="h-1.5 rounded-sm"
                                  :class="box <= 2 ? 'bg-secondary/50' : box === 3 ? 'bg-primary/50' : 'bg-success/50'">
                                </div>
                                <p class="text-xs font-semibold text-dark/70 mt-0.5">{{ studentKpi(s.userId).leitner.cardsByBox[box] ?? 0 }}</p>
                                <p class="text-xs text-dark/40">B{{ box }}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <!-- Matières étudiées -->
                        <div v-if="studentKpi(s.userId).subjects?.list?.length"
                          class="rounded-xl border border-gray px-3 py-2 space-y-1">
                          <p class="text-xs font-semibold text-primary uppercase tracking-wide">Matières étudiées</p>
                          <div class="flex flex-wrap gap-1">
                            <span v-for="sub in studentKpi(s.userId).subjects.list" :key="sub.subjectId"
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
                            <span class="font-semibold text-right">{{ studentKpi(s.userId).discipline.plannedThisWeek }} / {{ studentKpi(s.userId).discipline.completedThisWeek }}</span>
                            <span class="text-dark/60">Score 30 jours</span>
                            <span :class="['font-semibold text-right', disciplineScoreClass(studentKpi(s.userId).discipline.disciplineScore)]">
                              {{ studentKpi(s.userId).discipline.disciplineScore }} %
                            </span>
                          </div>
                        </div>

                        <!-- Badges débloqués -->
                        <div v-if="studentKpi(s.userId).badges?.filter(b => b.unlocked).length"
                          class="rounded-xl border border-gray px-3 py-2">
                          <p class="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Badges débloqués</p>
                          <div class="flex flex-wrap gap-2">
                            <span v-for="b in studentKpi(s.userId).badges.filter(b => b.unlocked)"
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
                </div>
              </div>
              <p v-else class="text-center text-sm text-dark/60">Aucun étudiant dans ce groupe.</p>
            </template>
            <p v-else class="text-center text-sm text-dark/60 py-4">Sélectionnez un groupe pour voir l'analyse.</p>
          </section>

          <!-- Sections et rendus -->
          <section class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
            <h2 class="text-lg font-semibold text-dark">Sections & Rendus</h2>
            <div v-if="loadingData" class="text-sm text-dark/60">Chargement...</div>
            <div v-else-if="sectionStore.sections.length === 0" class="text-sm text-dark/60">Aucune section créée.</div>
            <div v-else class="space-y-2">
              <div v-for="s in sectionStore.sections" :key="s.id"
                class="rounded-xl border border-gray overflow-hidden">
                <!-- En-tête de la section -->
                <div
                  :class="['px-4 py-3 flex items-center justify-between', s.type === 'rendu' ? 'cursor-pointer hover:bg-light/60 transition' : '']"
                  @click="s.type === 'rendu' && toggleRenduSection(s.id)">
                  <div>
                    <div class="flex items-center gap-2">
                      <span :class="s.type === 'rendu' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'"
                        class="rounded-full px-2 py-0.5 text-xs font-semibold uppercase">
                        {{ s.type === 'rendu' ? 'Rendu' : 'Section' }}
                      </span>
                      <p class="text-sm font-semibold text-dark">{{ s.title }}</p>
                    </div>
                    <p class="text-xs text-dark/60 mt-0.5">{{ s.description }}</p>
                    <p v-if="s.dueDate" class="text-xs text-dark/60">Date cible : {{ formatDate(s.dueDate) }}</p>
                  </div>
                  <div class="flex items-center gap-3 shrink-0">
                    <span v-if="s.type === 'rendu'" class="text-xs text-primary select-none">
                      {{ expandedRenduSections[s.id] ? '▲' : '▼ Voir rendus' }}
                    </span>
                    <button @click.stop="sectionStore.delete(selectedId, s.id)" class="text-xs text-secondary hover:underline">Supprimer</button>
                  </div>
                </div>
                <!-- Rendus étudiants (uniquement pour type=rendu) -->
                <div v-if="s.type === 'rendu' && expandedRenduSections[s.id]"
                  class="border-t border-gray bg-light/30 px-4 py-3 space-y-3">
                  <p v-if="!submissionStore.submissionStatus[s.id]" class="text-xs text-dark/60 italic">Chargement des rendus...</p>
                  <template v-else>
                    <!-- Compteurs -->
                    <div class="flex gap-3">
                      <span class="rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                        {{ submissionStore.submissionStatus[s.id].submitted.length }} rendu(s)
                      </span>
                      <span class="rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-semibold text-secondary">
                        {{ submissionStore.submissionStatus[s.id].notSubmitted.length }} en attente
                      </span>
                    </div>

                    <!-- Rendus reçus -->
                    <div v-if="submissionStore.submissionStatus[s.id].submitted.length" class="space-y-1">
                      <p class="text-xs font-semibold text-success uppercase tracking-wide">Rendus reçus</p>
                      <div v-for="sub in submissionStore.submissionStatus[s.id].submitted" :key="sub.submissionId"
                        class="flex items-center justify-between rounded-lg border border-success/20 bg-white px-3 py-2">
                        <div>
                          <p class="text-sm font-semibold text-dark">{{ sub.name }}</p>
                          <p class="text-xs text-dark/60">{{ sub.originalName }} · {{ formatFileSize(sub.fileSize) }} · {{ formatDate(sub.submittedAt) }}</p>
                        </div>
                        <button v-if="sub.fileKey" @click.stop="downloadSubmission(sub.fileKey)"
                          class="text-xs text-primary underline shrink-0 ml-3">
                          Télécharger
                        </button>
                      </div>
                    </div>

                    <!-- Étudiants sans rendu -->
                    <div v-if="submissionStore.submissionStatus[s.id].notSubmitted.length" class="space-y-1">
                      <p class="text-xs font-semibold text-secondary uppercase tracking-wide">Pas encore rendu</p>
                      <div v-for="stu in submissionStore.submissionStatus[s.id].notSubmitted" :key="stu.studentId"
                        class="rounded-lg border border-secondary/20 bg-white px-3 py-2">
                        <p class="text-sm text-dark/80">{{ stu.name }}</p>
                        <p class="text-xs text-dark/50">{{ stu.email }}</p>
                      </div>
                    </div>

                    <p v-if="!submissionStore.submissionStatus[s.id].submitted.length && !submissionStore.submissionStatus[s.id].notSubmitted.length"
                      class="text-xs text-dark/60 italic">Aucun étudiant dans ce groupe.</p>
                  </template>
                </div>
              </div>
            </div>
          </section>

          <!-- Échéances sur les séances -->
          <section class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
            <h2 class="text-lg font-semibold text-dark">Échéances des séances</h2>
            <div v-if="loadingData" class="text-sm text-dark/60">Chargement...</div>
            <div v-else-if="deadlineStore.groupDeadlines.length === 0" class="text-sm text-dark/60">Aucune échéance.</div>
            <div v-else class="space-y-2">
              <div v-for="dl in deadlineStore.groupDeadlines" :key="dl.id"
                class="rounded-xl border border-gray px-4 py-3 flex items-center justify-between">
                <div>
                  <p class="text-sm font-semibold text-dark">{{ dl.name }}</p>
                  <p class="text-xs text-dark/60">
                    {{ deadlineTypeLabel(dl.type) }} · {{ formatDate(dl.dueDate) }}
                    <span v-if="dl.test"> · <span class="text-primary">{{ dl.test.name }}</span></span>
                  </p>
                  <p class="text-xs text-dark/60">Séance : {{ dl.occurrence?.calendarEvent?.name }}</p>
                </div>
                <button @click="deleteGroupDeadline(dl.id)" class="text-xs text-secondary hover:underline">Supprimer</button>
              </div>
            </div>
          </section>

        </div>

        <!-- Colonne droite -->
        <div class="space-y-4">

          <!-- Formulaire nouvelle section -->
          <div class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
            <h3 class="text-base font-semibold text-dark">Créer une section / un rendu</h3>
            <input v-model="sectionForm.title" type="text" placeholder="Titre *"
              class="w-full rounded-lg border-2 border-gray px-3 py-2 text-sm" />
            <div class="flex gap-2">
              <button @click="sectionForm.type = 'section'"
                :class="[sectionForm.type === 'section' ? 'bg-primary text-light' : 'bg-light text-primary border-2 border-gray', 'rounded-lg px-3 py-2 text-sm flex-1']">Section</button>
              <button @click="sectionForm.type = 'rendu'"
                :class="[sectionForm.type === 'rendu' ? 'bg-secondary text-light' : 'bg-light text-secondary border-2 border-gray', 'rounded-lg px-3 py-2 text-sm flex-1']">Rendu</button>
            </div>
            <input v-model="sectionForm.description" type="text" placeholder="Description"
              class="w-full rounded-lg border-2 border-gray px-3 py-2 text-sm" />
            <input v-model="sectionForm.dueDate" type="date" class="w-full rounded-lg border-2 border-gray px-3 py-2 text-sm" />
            <button @click="submitSection"
              class="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-light hover:bg-primary/90 transition">
              Créer
            </button>
            <p v-if="sectionForm.error" class="text-xs text-secondary">{{ sectionForm.error }}</p>
          </div>

          <!-- Formulaire partage ressource — drag & drop -->
          <div class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
            <h3 class="text-base font-semibold text-dark">Partager un document</h3>
            <input v-model="resourceForm.title" type="text" placeholder="Titre *"
              class="w-full rounded-lg border-2 border-gray px-3 py-2 text-sm" />
            <select v-model="resourceForm.type" class="w-full rounded-lg border-2 border-gray px-3 py-2 text-sm bg-white">
              <option value="cours">Cours</option>
              <option value="carte_mentale">Carte mentale</option>
              <option value="sujet">Sujet / DS</option>
              <option value="autre">Autre</option>
            </select>

            <!-- Zone drag & drop -->
            <div
              @dragover.prevent="resourceForm.dragOver = true"
              @dragleave.prevent="resourceForm.dragOver = false"
              @drop.prevent="onFileDrop"
              @click="() => $refs.fileInput.click()"
              :class="[
                'cursor-pointer rounded-xl border-2 border-dashed px-4 py-6 text-center transition',
                resourceForm.dragOver ? 'border-primary bg-primary/5' : 'border-gray hover:border-primary/50'
              ]">
              <div v-if="resourceForm.file">
                <p class="text-sm font-semibold text-dark">{{ resourceForm.file.name }}</p>
                <p class="text-xs text-dark/60 mt-0.5">{{ formatFileSize(resourceForm.file.size) }}</p>
                <button @click.stop="resourceForm.file = null" class="mt-1 text-xs text-secondary hover:underline">Retirer</button>
              </div>
              <div v-else>
                <p class="text-sm text-dark/60">Glissez un fichier ici ou <span class="text-primary underline">parcourez</span></p>
                <p class="text-xs text-dark/40 mt-1">PDF, Word, PowerPoint, Excel — max 10 Mo</p>
              </div>
            </div>
            <input ref="fileInput" type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*"
              class="hidden"
              @change="onFileChange" />

            <button @click="submitResource" :disabled="resourceStore.uploading"
              :class="[resourceStore.uploading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-primary/90', 'w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-light transition']">
              {{ resourceStore.uploading ? 'Upload en cours...' : 'Partager' }}
            </button>
            <p v-if="resourceForm.error" class="text-xs text-secondary">{{ resourceForm.error }}</p>
          </div>

          <!-- Ressources existantes -->
          <div class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-2">
            <h3 class="text-base font-semibold text-dark">Documents partagés</h3>
            <div v-if="resourceStore.resources.length === 0" class="text-sm text-dark/60">Aucun document.</div>
            <div v-for="r in resourceStore.resources" :key="r.id"
              class="flex items-center justify-between rounded-xl border border-gray px-3 py-2 text-sm">
              <div class="flex items-center gap-2">
                <span class="text-lg">{{ fileIcon(r.mimeType) }}</span>
                <div>
                  <p class="font-semibold text-dark leading-tight">{{ r.title }}</p>
                  <p class="text-xs text-dark/60">{{ resourceTypeLabel(r.type) }}{{ r.fileSize ? ' · ' + formatFileSize(r.fileSize) : '' }}</p>
                </div>
              </div>
              <div class="flex gap-2">
                <button v-if="r.fileKey" @click="openFile(r.fileKey)" class="text-xs text-primary underline">Ouvrir</button>
                <button @click="resourceStore.delete(selectedId, r.id)" class="text-xs text-secondary hover:underline">×</button>
              </div>
            </div>
          </div>

          <!-- Formulaire nouvelle échéance -->
          <div class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
            <h3 class="text-base font-semibold text-dark">Ajouter une échéance</h3>
            <input v-model="deadlineForm.name" type="text" placeholder="Titre *"
              class="w-full rounded-lg border-2 border-gray px-3 py-2 text-sm" />
            <select v-model="deadlineForm.type" class="w-full rounded-lg border-2 border-gray px-3 py-2 text-sm bg-white">
              <option value="ds">DS</option>
              <option value="devoir">Devoir / DM</option>
              <option value="exposé">Exposé</option>
              <option value="autre">Autre</option>
            </select>
            <select v-model="deadlineForm.occurrenceId" class="w-full rounded-lg border-2 border-gray px-3 py-2 text-sm bg-white">
              <option value="">Séance concernée *</option>
              <option v-for="occ in allOccurrences" :key="occ.id" :value="occ.id">
                {{ occ.calendarEvent?.name }} — {{ formatDate(occ.date) }}
              </option>
            </select>
            <input v-model="deadlineForm.dueDate" type="date" placeholder="Date limite *"
              class="w-full rounded-lg border-2 border-gray px-3 py-2 text-sm" />
            <input v-model="deadlineForm.dueTime" type="time"
              class="w-full rounded-lg border-2 border-gray px-3 py-2 text-sm" />
            <select v-model="deadlineForm.testId" class="w-full rounded-lg border-2 border-gray px-3 py-2 text-sm bg-white">
              <option :value="null">Exercice associé (optionnel)</option>
              <option v-for="t in testStore.tests" :key="t.testId" :value="t.testId">{{ t.name }}</option>
            </select>
            <button @click="submitDeadline"
              class="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-light hover:bg-primary/90 transition">
              Ajouter l'échéance
            </button>
            <p v-if="deadlineForm.error" class="text-xs text-secondary">{{ deadlineForm.error }}</p>
          </div>

          <!-- Inviter un étudiant -->
          <div class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
            <h3 class="text-base font-semibold text-dark">Inviter un étudiant</h3>
            <input v-model="inviteForm.targetEmail" type="email" placeholder="Email *"
              class="w-full rounded-lg border-2 border-gray px-3 py-2 text-sm" />
            <button @click="submitInvite"
              class="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-light hover:bg-primary/90 transition">
              Envoyer l'invitation
            </button>
            <p v-if="inviteForm.message" :class="inviteForm.error ? 'text-secondary' : 'text-success'" class="text-xs">
              {{ inviteForm.message }}
            </p>
          </div>

          <!-- Membres du groupe -->
          <div class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
            <h3 class="text-base font-semibold text-dark">Membres ({{ currentGroup.members?.length ?? 0 }})</h3>
            <div class="space-y-2">
              <div v-for="m in currentGroup.members" :key="m.userId"
                class="rounded-xl border border-gray px-3 py-2 flex items-center justify-between text-sm">
                <div>
                  <p class="font-semibold text-dark">{{ m.user?.name ?? `#${m.userId}` }}</p>
                  <p class="text-xs text-dark/60">{{ m.user?.email }}</p>
                </div>
                <div class="flex items-center gap-2">
                  <span :class="m.role === 'teacher' ? 'bg-primary/10 text-primary' : 'bg-gray text-dark/60'"
                    class="rounded-full px-2 py-0.5 text-xs font-semibold">
                    {{ m.role === 'teacher' ? 'Enseignant' : 'Étudiant' }}
                  </span>
                  <button v-if="m.role === 'student'"
                    @click="classGroupStore.removeMember(selectedId, m.userId)"
                    class="text-secondary text-xs hover:underline">×</button>
                </div>
              </div>
              <p v-if="!currentGroup.members?.length" class="text-sm text-dark/60">Aucun membre.</p>
            </div>

            <!-- Invitations en attente -->
            <div v-if="invitationStore.groupInvitations.length > 0" class="pt-2 border-t border-gray space-y-1">
              <p class="text-xs font-semibold text-dark/60 uppercase tracking-wide">En attente</p>
              <div v-for="inv in invitationStore.groupInvitations" :key="inv.id"
                class="rounded-xl border border-gray/50 px-3 py-2 flex items-center justify-between text-xs text-dark/70">
                <span>{{ inv.targetEmail }}</span>
                <span class="rounded-full bg-gray px-2 py-0.5">
                  {{ inv.role === 'teacher' ? 'Enseignant' : 'Étudiant' }}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </template>

    <div v-else class="rounded-2xl border-2 border-gray bg-white p-6 text-center text-dark/70">
      Sélectionnez un groupe pour accéder à votre espace enseignant.
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, reactive } from 'vue'
import { useClassGroupStore } from '@/stores/classGroups'
import { useCalendarEventStore } from '@/stores/calendarEvents'
import { useDeadlineStore } from '@/stores/deadlines'
import { useTestStore } from '@/stores/tests'
import { useClassGroupSectionStore } from '@/stores/classGroupSections'
import { useClassGroupResourceStore } from '@/stores/classGroupResources'
import { useTeacherAnalytics } from '@/composables/useTeacherAnalytics'
import { useAuthStore } from '@/stores/auth'
import { useKpiConsentStore } from '@/stores/kpiConsent'
import { useClassGroupSubmissionStore } from '@/stores/classGroupSubmissions'
import { useInvitationStore } from '@/stores/invitations'
import { useRole } from '@/composables/useRole'
import StudentDetailComponent from '@/components/StudentDetailComponent.vue'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

const { isAdminEtablissement } = useRole()
const classGroupStore = useClassGroupStore()
const calendarStore = useCalendarEventStore()
const deadlineStore = useDeadlineStore()
const testStore = useTestStore()
const sectionStore = useClassGroupSectionStore()
const resourceStore = useClassGroupResourceStore()
const authStore = useAuthStore()
const kpiConsentStore = useKpiConsentStore()
const submissionStore = useClassGroupSubmissionStore()
const invitationStore = useInvitationStore()
const { analytics, analyticsLoading, expandedAnalyticsStudents, currentWeekScore, atRiskStudents, scoreTextClass, toggleStudentDetail, loadStudentAnalytics } = useTeacherAnalytics()

const selectedId = ref(null)
const loadingData = ref(false)

// Le gérant d'établissement voit tous les groupes ; un enseignant ne voit que les siens
const groups = computed(() => {
  if (isAdminEtablissement.value) return classGroupStore.groups
  const userId = authStore.user?.userId
  return classGroupStore.groups.filter((g) =>
    g.members?.some((m) => m.userId === userId && m.role === 'teacher')
  )
})

const currentGroup = computed(() => classGroupStore.groups.find((g) => g.id === selectedId.value))

const allOccurrences = computed(() =>
  calendarStore.groupEvents.flatMap((ev) =>
    (ev.occurrences ?? []).map((o) => ({ ...o, calendarEvent: ev }))
  ).sort((a, b) => new Date(`${a.date}T${a.startTime}`) - new Date(`${b.date}T${b.startTime}`))
)

const expandedRenduSections = reactive({})

const sectionForm = reactive({ title: '', type: 'section', description: '', dueDate: '', error: '' })
const resourceForm = reactive({ title: '', type: 'cours', file: null, dragOver: false, error: '' })
const deadlineForm = reactive({ name: '', type: 'ds', occurrenceId: '', dueDate: '', dueTime: '', testId: null, error: '' })
const inviteForm = reactive({ targetEmail: '', role: 'student', message: '', error: false })

async function selectGroup(id) {
  selectedId.value = id
  loadingData.value = true
  kpiConsentStore.clearStudentKpis()
  submissionStore.clearSectionSubmissions()
  submissionStore.clearSubmissionStatus()
  Object.keys(expandedRenduSections).forEach((k) => delete expandedRenduSections[k])
  await Promise.all([
    calendarStore.fetchByGroup(id, true),
    deadlineStore.fetchByGroup(id),
    sectionStore.fetchByGroup(id),
    resourceStore.fetchByGroup(id),
    loadStudentAnalytics(id),
    invitationStore.fetchByGroup(id),
  ])
  loadingData.value = false
}

// Ouvre/ferme l'accordion étudiant et (re)charge les KPI à chaque ouverture
function toggleStudentAndLoadKpis(userId) {
  toggleStudentDetail(userId)
  if (expandedAnalyticsStudents[userId]) {
    kpiConsentStore.fetchStudentKpis(userId, selectedId.value)
  }
}

function studentKpi(userId) {
  return kpiConsentStore.studentKpis[userId]
}

function disciplineScoreClass(score) {
  if (score >= 70) return 'text-success'
  if (score >= 40) return 'text-primary'
  return 'text-secondary'
}

// Normalise la hauteur d'une barre d'activité hebdomadaire (max 7 séances/sem.)
function weeklyBarHeight(count) {
  if (!count) return '3px'
  return Math.max(20, Math.min(100, Math.round((count / 7) * 100))) + '%'
}

function formatMinutes(minutes) {
  if (!minutes) return '0 min'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h${m > 0 ? ' ' + m + 'min' : ''}` : `${m} min`
}

onMounted(async () => {
  if (!classGroupStore.groups.length) await classGroupStore.fetchGroups()
  if (!testStore.tests.length) testStore.fetchTests()
  if (groups.value.length) selectGroup(groups.value[0].id)
})

watch(groups, (list) => {
  if (!selectedId.value && list.length) selectGroup(list[0].id)
})

async function submitSection() {
  sectionForm.error = ''
  if (!sectionForm.title.trim()) { sectionForm.error = 'Le titre est requis.'; return }
  const ok = await sectionStore.create(selectedId.value, {
    title: sectionForm.title.trim(),
    type: sectionForm.type,
    description: sectionForm.description.trim() || null,
    dueDate: sectionForm.dueDate || null,
  })
  if (ok) Object.assign(sectionForm, { title: '', description: '', dueDate: '', error: '' })
}

async function submitResource() {
  resourceForm.error = ''
  if (!resourceForm.title.trim()) { resourceForm.error = 'Le titre est requis.'; return }
  if (!resourceForm.file) { resourceForm.error = 'Sélectionnez un fichier à partager.'; return }
  const ok = await resourceStore.uploadAndCreate(selectedId.value, resourceForm.file, {
    title: resourceForm.title.trim(),
    type: resourceForm.type,
  })
  if (ok) Object.assign(resourceForm, { title: '', file: null, dragOver: false, error: '' })
}

function onFileDrop(event) {
  resourceForm.dragOver = false
  const file = event.dataTransfer?.files?.[0]
  if (file) resourceForm.file = file
}

function onFileChange(event) {
  const file = event.target?.files?.[0]
  if (file) resourceForm.file = file
}

function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function fileIcon(mimeType) {
  if (!mimeType) return '📄'
  if (mimeType === 'application/pdf') return '📕'
  if (mimeType.startsWith('image/')) return '🖼'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📊'
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📈'
  return '📄'
}

async function submitDeadline() {
  deadlineForm.error = ''
  if (!deadlineForm.name.trim()) { deadlineForm.error = 'Le titre est requis.'; return }
  if (!deadlineForm.occurrenceId) { deadlineForm.error = 'Sélectionnez une séance.'; return }
  if (!deadlineForm.dueDate) { deadlineForm.error = 'La date limite est requise.'; return }
  const ok = await deadlineStore.createDeadline({
    name: deadlineForm.name.trim(),
    type: deadlineForm.type,
    occurrenceId: Number(deadlineForm.occurrenceId),
    dueDate: deadlineForm.dueDate,
    dueTime: deadlineForm.dueTime || null,
    testId: deadlineForm.testId || null,
  })
  if (ok) {
    Object.assign(deadlineForm, { name: '', occurrenceId: '', dueDate: '', dueTime: '', testId: null, error: '' })
    await deadlineStore.fetchByGroup(selectedId.value)
  }
}

async function toggleRenduSection(sectionId) {
  if (expandedRenduSections[sectionId]) {
    expandedRenduSections[sectionId] = false
    return
  }
  expandedRenduSections[sectionId] = true
  await submissionStore.fetchStatus(selectedId.value, sectionId)
}

async function downloadSubmission(fileKey) {
  if (!fileKey) { notif.notify('Aucun fichier associé.', 'error'); return }
  try {
    const resp = await api.get('storage/presign', { key: fileKey, disposition: 'attachment' })
    if (resp?.status === 200 && resp.data?.url) {
      const a = document.createElement('a')
      a.href = resp.data.url
      a.target = '_blank'
      a.rel = 'noopener'
      a.click()
    } else {
      notif.notify('Impossible de télécharger le fichier.', 'error')
    }
  } catch {
    notif.notify('Impossible de télécharger le fichier.', 'error')
  }
}

async function openFile(fileKey) {
  if (!fileKey) { notif.notify('Aucun fichier associé.', 'error'); return }
  const newWindow = window.open('', '_blank')
  if (!newWindow) { notif.notify('Popup bloqué — autorisez les popups pour ce site.', 'error'); return }
  try {
    const resp = await api.get('storage/presign', { key: fileKey })
    if (resp?.status === 200 && resp.data?.url) {
      newWindow.location.href = resp.data.url
    } else {
      newWindow.close()
      notif.notify("Impossible d'ouvrir le fichier.", 'error')
    }
  } catch {
    newWindow.close()
    notif.notify("Impossible d'ouvrir le fichier.", 'error')
  }
}

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function deadlineTypeLabel(type) {
  const map = { ds: 'DS', devoir: 'Devoir', exposé: 'Exposé', autre: 'Autre' }
  return map[type] ?? type
}

function resourceTypeLabel(type) {
  const map = { cours: 'Cours', carte_mentale: 'Carte mentale', sujet: 'Sujet', autre: 'Autre' }
  return map[type] ?? type
}

async function submitInvite() {
  inviteForm.error = false
  inviteForm.message = ''
  if (!inviteForm.targetEmail) { inviteForm.error = true; inviteForm.message = "L'email est requis."; return }
  const ok = await invitationStore.invite(selectedId.value, { targetEmail: inviteForm.targetEmail, role: inviteForm.role })
  inviteForm.error = !ok
  inviteForm.message = ok ? 'Invitation envoyée.' : "Erreur lors de l'envoi."
  if (ok) {
    inviteForm.targetEmail = ''
    await invitationStore.fetchByGroup(selectedId.value)
  }
}

async function deleteGroupDeadline(id) {
  const ok = await deadlineStore.deleteDeadline(id)
  if (ok) await deadlineStore.fetchByGroup(selectedId.value)
}
</script>
