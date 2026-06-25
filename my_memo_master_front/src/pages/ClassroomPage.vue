<template>
  <div class="classroom-page space-y-6 px-2 sm:px-4 lg:px-6">

    <!-- Invitations en attente -->
    <section v-if="pendingInvitations.length > 0" class="rounded-2xl border-2 border-primary/40 bg-primary/5 p-4 shadow-sm space-y-3">
      <h2 class="text-lg font-semibold text-primary">Invitations en attente ({{ pendingInvitations.length }})</h2>
      <div v-for="inv in pendingInvitations" :key="inv.id" class="flex items-center justify-between rounded-xl border border-gray bg-white px-4 py-3">
        <div>
          <p class="font-semibold text-dark">{{ inv.classGroup?.name ?? `Groupe #${inv.classGroupId}` }}</p>
          <p class="text-xs text-dark/60">Rôle : {{ inv.role === 'teacher' ? 'Enseignant' : 'Étudiant' }} · Invité par {{ inv.invitedBy?.name ?? '—' }}</p>
        </div>
        <div class="flex gap-2">
          <button @click="respondInvitation(inv.id, 'accepted')"
            class="rounded-lg bg-success/10 px-3 py-1 text-sm font-semibold text-success hover:bg-success/20 transition">
            Accepter
          </button>
          <button @click="respondInvitation(inv.id, 'declined')"
            class="rounded-lg bg-secondary/10 px-3 py-1 text-sm font-semibold text-secondary hover:bg-secondary/20 transition">
            Décliner
          </button>
        </div>
      </div>
    </section>

    <section class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div class="flex items-center gap-2">
          <!-- Badge rôle courant -->
          <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {{ viewRole === 'prof' ? 'Vue Professeur' : 'Vue Étudiant' }}
          </span>
          <!-- Toggle uniquement visible pour les admins plateforme/établissement -->
          <template v-if="isAdmin">
            <span class="text-sm text-dark/70">Prévisualiser :</span>
            <button
              :class="[viewRole === 'prof' ? 'bg-primary text-light' : 'bg-light text-primary border-2 border-gray', 'px-3 py-2 rounded-lg text-sm font-medium']"
              @click="setViewRole('prof')">
              Professeur
            </button>
            <button
              :class="[viewRole === 'student' ? 'bg-primary text-light' : 'bg-light text-primary border-2 border-gray', 'px-3 py-2 rounded-lg text-sm font-medium']"
              @click="setViewRole('student')">
              Etudiant
            </button>
          </template>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <input v-model="filters.search" type="search" placeholder="Rechercher une classe"
            class="rounded-lg border-2 border-gray px-3 py-2 text-sm min-w-[200px]" />
          <select v-model="filters.level"
            class="rounded-lg border-2 border-gray px-3 py-2 text-sm bg-white text-dark min-w-[180px]">
            <option value="all">Tous niveaux</option>
            <option v-for="level in levels" :key="level" :value="level">{{ level }}</option>
          </select>
          <Button v-if="canManageGroups" type="outline" :callback="warnNoBackend">Nouvelle classe</Button>
        </div>
      </div>

      <div class="flex gap-3 overflow-x-auto pb-1">
        <div v-for="group in filteredGroups" :key="group.id" @click="selectGroup(group.id)"
          :class="[selectedGroupId === group.id ? 'border-primary bg-light/70' : 'border-gray', 'min-w-[240px] cursor-pointer rounded-xl border-2 p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow']">
          <div class="flex items-center justify-between gap-2">
            <div>
              <p class="text-xs uppercase tracking-wide text-dark/60">{{ group.level }}</p>
              <p class="text-lg font-semibold text-primary">{{ group.name }}</p>
              <p class="text-xs text-dark/60">{{ group.code }}</p>
            </div>
            <div class="flex flex-col items-end gap-1">
              <span class="rounded-full bg-primary/10 px-2 py-1 text-[11px] text-primary">{{ group.students.length }} élèves</span>
              <span class="rounded-full bg-secondary/10 px-2 py-1 text-[11px] text-secondary">{{ group.sessions.length }} sections</span>
            </div>
          </div>
          <div class="mt-2 flex items-center gap-3 text-xs text-dark/70">
            <span class="flex items-center gap-1"><CalendarDaysIcon class="size-4" />{{ formatDate(getNextEvent(group, 'course')?.start) || 'Pas de cours prévu' }}</span>
            <span class="flex items-center gap-1"><DocumentIcon class="size-4" />{{ group.resources.length }} docs</span>
          </div>
        </div>
        <p v-if="filteredGroups.length === 0" class="text-dark/70 text-sm">Aucune classe ne correspond aux filtres.</p>
      </div>
      <p v-if="creationMessage" class="text-xs text-dark/60">{{ creationMessage }}</p>
    </section>

    <section v-if="currentGroup" class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div class="space-y-4 lg:col-span-2">
        <div class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-4">
          <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p class="text-xs uppercase tracking-wide text-dark/60">{{ currentGroup.level }}</p>
              <h2 class="text-2xl font-bold text-primary">{{ currentGroup.name }}</h2>
              <p class="text-sm text-dark/70">Code : {{ currentGroup.code }} · Responsable : {{ currentGroup.teacher }}</p>
            </div>
            <div class="flex flex-wrap gap-2 text-xs text-dark/70">
              <span class="rounded-full bg-primary/10 px-3 py-1 text-primary">{{ activeStudents.length }} étudiants actifs</span>
              <span class="rounded-full bg-secondary/10 px-3 py-1 text-secondary">{{ currentGroup.sessions.length }} sections/rendus</span>
              <span class="rounded-full bg-gray px-3 py-1 text-dark">{{ currentGroup.resources.length }} ressources</span>
            </div>
          </div>

          <!-- KPI groupe -->
          <div v-if="kpi" class="grid grid-cols-2 gap-2 md:grid-cols-4 text-center">
            <div class="rounded-xl border border-gray bg-light p-3">
              <p class="text-2xl font-bold text-primary">{{ kpi.memberCount }}</p>
              <p class="text-xs text-dark/60 mt-1">Membres</p>
            </div>
            <div class="rounded-xl border border-gray bg-light p-3">
              <p class="text-2xl font-bold text-primary">{{ kpi.studentCount }}</p>
              <p class="text-xs text-dark/60 mt-1">Étudiants</p>
            </div>
            <div class="rounded-xl border border-gray bg-light p-3">
              <p class="text-2xl font-bold text-secondary">{{ kpi.pendingInvitations }}</p>
              <p class="text-xs text-dark/60 mt-1">Invitations en attente</p>
            </div>
            <div class="rounded-xl border border-gray bg-light p-3">
              <p class="text-2xl font-bold" :class="kpi.avgScore !== null ? 'text-primary' : 'text-dark/40'">
                {{ kpi.avgScore !== null ? kpi.avgScore + ' %' : '—' }}
              </p>
              <p class="text-xs text-dark/60 mt-1">Score moyen</p>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div class="rounded-xl border border-gray p-3">
              <div class="flex items-center justify-between text-sm text-dark/70">
                <span>Prochain cours</span>
                <AcademicCapIcon class="size-5 text-primary" />
              </div>
              <p class="mt-1 text-lg font-semibold text-dark">{{ nextCourse?.title || 'A planifier' }}</p>
              <p class="text-sm text-dark/60">{{ formatDate(nextCourse?.start) }}</p>
            </div>
            <div class="rounded-xl border border-gray p-3">
              <div class="flex items-center justify-between text-sm text-dark/70">
                <span>Prochain DS</span>
                <ExclamationTriangleIcon class="size-5 text-secondary" />
              </div>
              <p class="mt-1 text-lg font-semibold text-dark">{{ nextDs?.title || 'A planifier' }}</p>
              <p class="text-sm text-dark/60">{{ formatDate(nextDs?.start) }}</p>
            </div>
            <div class="rounded-xl border border-gray p-3">
              <div class="flex items-center justify-between text-sm text-dark/70">
                <span>Ressources partagées</span>
                <ArrowUpOnSquareIcon class="size-5 text-primary" />
              </div>
              <p class="mt-1 text-lg font-semibold text-dark">{{ currentGroup.resources.length }}</p>
              <p class="text-sm text-dark/60">Docs, cartes mentales, supports</p>
            </div>
          </div>

          <div class="mt-2">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-dark">Sections et rendus</h3>
              <span class="text-xs text-dark/60">Clique pour déplier</span>
            </div>
            <div class="mt-2 space-y-3">
              <div v-for="session in currentGroup.sessions" :key="session.id"
                :class="['rounded-xl border px-3 py-2 shadow-sm transition', expandedSessions[session.id] ? 'border-primary bg-light/70' : 'border-gray bg-white']">
                <button class="flex w-full items-center justify-between" @click="toggleSession(session.id)">
                  <div class="flex items-center gap-3 text-left">
                    <span :class="[session.type === 'section' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary', 'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide']">
                      {{ session.type === 'section' ? 'Section' : 'Rendu' }}
                    </span>
                    <div>
                      <p class="text-base font-semibold text-dark">{{ session.title }}</p>
                      <p class="text-xs text-dark/60">{{ session.description }}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-3 text-xs text-dark/60">
                    <span class="rounded-full bg-gray px-2 py-1">{{ formatDate(session.dueDate) || 'pas de date' }}</span>
                    <ChevronRightIcon :class="['size-5 text-primary transition', expandedSessions[session.id] ? 'rotate-90' : '']" />
                  </div>
                </button>
                <div v-if="expandedSessions[session.id]" class="mt-3 border-t border-gray/80 pt-3 text-sm text-dark/80 space-y-2">
                  <div class="flex flex-wrap gap-2">
                    <span class="rounded-full bg-primary/10 px-3 py-1 text-primary text-xs">{{ session.resources.length }} ressources</span>
                    <span class="rounded-full bg-secondary/10 px-3 py-1 text-secondary text-xs">{{ session.attachments.length }} documents</span>
                  </div>
                  <div class="space-y-1">
                    <p class="text-xs uppercase tracking-wide text-dark/60">Ressources</p>
                    <ul class="space-y-1">
                      <li v-for="resource in session.resources" :key="resource.id" class="flex items-center justify-between rounded-lg bg-light px-3 py-2">
                        <span>{{ resource.title }}</span>
                        <span class="text-xs text-dark/60">{{ resource.type }}</span>
                      </li>
                      <p v-if="session.resources.length === 0" class="text-dark/60 text-xs">Pas encore de ressource.</p>
                    </ul>
                  </div>
                  <div class="space-y-1">
                    <p class="text-xs uppercase tracking-wide text-dark/60">Documents déposés</p>
                    <ul class="space-y-1">
                      <li v-for="doc in session.attachments" :key="doc.id" class="flex flex-col gap-1 rounded-lg border border-gray px-3 py-2 md:flex-row md:items-center md:justify-between">
                        <div class="flex flex-col">
                          <span class="font-semibold text-dark">{{ doc.title }}</span>
                          <span class="text-xs text-dark/60">PDF · {{ formatDate(doc.date) }}</span>
                        </div>
                        <a :href="doc.url || '#'" target="_blank" rel="noopener" :download="doc.url ? '' : null"
                          class="inline-flex items-center justify-center rounded-lg border border-primary px-3 py-1 text-xs font-medium text-primary hover:bg-primary hover:text-light transition">
                          Télécharger
                        </a>
                      </li>
                      <p v-if="session.attachments.length === 0" class="text-dark/60 text-xs">Aucun dépôt pour l'instant.</p>
                    </ul>
                    <div v-if="session.type === 'rendu'" class="mt-2 flex flex-col gap-2 rounded-lg border border-dashed border-gray p-3 bg-light/60">
                      <input v-model="getUploadForm(session.id).title" type="text" placeholder="Titre du document"
                        class="w-full rounded-lg border-2 border-gray px-3 py-2 text-sm" />
                      <Button :callback="() => attachDocument(session.id)" type="outline">Joindre un document</Button>
                      <p v-if="getUploadForm(session.id).status" class="text-xs text-success">{{ getUploadForm(session.id).status }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Analyse pédagogique — vue enseignant uniquement -->
        <div v-if="viewRole === 'prof'" class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-dark">Analyse pédagogique</h3>
            <button @click="loadStudentAnalytics(selectedGroupId)"
              class="rounded-lg border border-gray px-2 py-1 text-xs text-primary hover:bg-light transition">
              Actualiser
            </button>
          </div>

          <div v-if="analyticsLoading" class="py-4 text-center text-sm text-dark/60">Chargement...</div>

          <template v-else-if="analytics">
            <!-- Agrégats -->
            <div class="grid grid-cols-3 gap-2 text-center">
              <div class="rounded-xl border border-gray bg-light p-3">
                <p class="text-2xl font-bold text-success">{{ analytics.activeStudentsCount }}</p>
                <p class="mt-1 text-xs text-dark/60">Actifs (7 jours)</p>
              </div>
              <div :class="['rounded-xl border p-3', analytics.atRiskCount > 0 ? 'border-secondary/40 bg-secondary/5' : 'border-gray bg-light']">
                <p class="text-2xl font-bold" :class="analytics.atRiskCount > 0 ? 'text-secondary' : 'text-success'">
                  {{ analytics.atRiskCount }}
                </p>
                <p class="mt-1 text-xs text-dark/60">À risque</p>
              </div>
              <div class="rounded-xl border border-gray bg-light p-3">
                <p class="text-2xl font-bold" :class="currentWeekScore !== null ? scoreTextClass(currentWeekScore) : 'text-dark/40'">
                  {{ currentWeekScore !== null ? currentWeekScore + ' %' : '—' }}
                </p>
                <p class="mt-1 text-xs text-dark/60">Score cette semaine</p>
              </div>
            </div>

            <!-- Tendance hebdo -->
            <div>
              <p class="mb-2 text-sm font-medium text-dark/80">Tendance des 4 dernières semaines</p>
              <div class="grid grid-cols-4 gap-2 text-center">
                <div v-for="week in analytics.scoreWeeklyTrend" :key="week.weekStart"
                  :class="['rounded-xl border p-2', week.avgScore !== null ? 'border-gray bg-light' : 'border-gray/40 bg-gray/20']">
                  <p class="text-[10px] text-dark/60">{{ formatShortDate(week.weekStart) }}</p>
                  <p class="mt-1 text-lg font-bold" :class="week.avgScore !== null ? scoreTextClass(week.avgScore) : 'text-dark/30'">
                    {{ week.avgScore !== null ? week.avgScore + ' %' : '—' }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Alertes décrochage -->
            <div v-if="atRiskStudents.length > 0">
              <p class="mb-2 text-sm font-medium text-secondary">Alertes décrochage ({{ atRiskStudents.length }})</p>
              <div class="space-y-2">
                <div v-for="student in atRiskStudents" :key="student.userId"
                  class="rounded-xl border border-secondary/30 bg-secondary/5 px-3 py-2">
                  <p class="text-sm font-semibold text-dark">{{ student.name }}</p>
                  <div class="mt-1 flex flex-wrap gap-1">
                    <span v-for="reason in student.atRiskReasons" :key="reason"
                      class="rounded-full bg-secondary/10 px-2 py-0.5 text-xs text-secondary">{{ reason }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tableau étudiants -->
            <div v-if="analytics.students.length > 0">
              <p class="mb-2 text-sm font-medium text-dark/80">Tous les étudiants ({{ analytics.students.length }})</p>
              <div class="space-y-2">
                <div v-for="student in analytics.students" :key="student.userId"
                  :class="['rounded-xl border transition', expandedAnalyticsStudents[student.userId] ? 'border-primary bg-light/50' : 'border-gray bg-white']">
                  <button class="flex w-full items-center justify-between px-3 py-2"
                    @click="toggleStudentDetail(student.userId)">
                    <div class="flex items-center gap-2">
                      <span :class="['rounded-full px-2 py-0.5 text-xs font-semibold', student.atRisk ? 'bg-secondary/10 text-secondary' : 'bg-success/10 text-success']">
                        {{ student.atRisk ? '⚠ Risque' : '✓ OK' }}
                      </span>
                      <span class="text-sm font-semibold text-dark">{{ student.name }}</span>
                    </div>
                    <div class="flex items-center gap-3 text-xs text-dark/60">
                      <span :class="student.avgScore !== null ? scoreTextClass(student.avgScore) : ''">
                        {{ student.avgScore !== null ? student.avgScore + ' %' : '—' }}
                      </span>
                      <span>{{ student.lastActivityAt ? 'il y a ' + student.daysInactive + 'j' : 'jamais actif' }}</span>
                      <ChevronRightIcon :class="['size-4 text-primary transition', expandedAnalyticsStudents[student.userId] ? 'rotate-90' : '']" />
                    </div>
                  </button>
                  <div v-if="expandedAnalyticsStudents[student.userId]" class="space-y-1 border-t border-gray/80 px-3 pb-2 pt-2 text-xs text-dark/60">
                    <p>Email : {{ student.email || '—' }}</p>
                    <p>Dernière activité : {{ student.lastActivityAt ?? 'aucune' }}</p>
                    <div v-if="student.scoreTrend.length > 0">
                      <p class="mb-1">Derniers résultats :</p>
                      <div class="flex flex-wrap gap-1">
                        <span v-for="(entry, idx) in student.scoreTrend" :key="idx"
                          :class="['rounded-full bg-gray/30 px-2 py-0.5 font-semibold', scoreTextClass(entry.score)]">
                          {{ entry.score }} %
                        </span>
                      </div>
                    </div>
                    <p v-else class="text-dark/40">Aucun exercice enseignant enregistré.</p>
                  </div>
                </div>
              </div>
            </div>
            <p v-else class="py-2 text-center text-sm text-dark/60">Aucun étudiant dans ce groupe.</p>
          </template>

          <p v-else class="py-4 text-center text-sm text-dark/60">Analyse non disponible pour ce groupe.</p>
        </div>

        <div class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-dark">Calendrier du groupe</h3>
            <span class="text-xs text-dark/60">{{ currentGroup.events.length }} évènements</span>
          </div>
          <div class="mt-3 grid gap-3 md:grid-cols-2">
            <div v-for="event in sortedEvents" :key="event.id"
              :class="['rounded-xl border px-3 py-3 shadow-sm', event.type === 'ds' ? 'border-secondary/70' : 'border-gray']">
              <div class="flex items-center justify-between text-sm">
                <span :class="[badgeForEvent(event.type)]">{{ labelForEvent(event.type) }}</span>
                <span class="text-dark/60">{{ formatTimeRange(event.start, event.end) }}</span>
              </div>
              <p class="mt-1 text-base font-semibold text-dark">{{ event.title }}</p>
              <p class="text-sm text-dark/60">{{ formatDate(event.start) }} · {{ event.location }}</p>
              <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-dark/70">
                <span class="rounded-full bg-gray px-2 py-1">{{ event.students.length }} élèves</span>
                <span v-if="event.status === 'conflict'" class="flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-1 text-secondary">
                  <ExclamationTriangleIcon class="size-4" /> Conflit agenda
                </span>
                <span v-else class="flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-success">
                  <CheckCircleIcon class="size-4" /> Confirmé
                </span>
              </div>
            </div>
          </div>
          <div v-if="viewRole === 'student'" class="mt-4 rounded-xl border border-primary/40 bg-primary/5 p-3">
            <p class="text-sm font-semibold text-primary">Mon prochain créneau</p>
            <p class="text-sm text-dark/70">{{ nextForStudent?.title || 'Rien de planifié' }}</p>
            <p class="text-xs text-dark/60">{{ formatDate(nextForStudent?.start) }} {{ formatTimeRange(nextForStudent?.start, nextForStudent?.end) }}</p>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <div v-if="viewRole === 'prof'" class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
          <h3 class="text-lg font-semibold text-dark">Créer une section / un rendu</h3>
          <input v-model="sessionForm.title" type="text" placeholder="Nom de section"
            class="w-full rounded-lg border-2 border-gray px-3 py-2 text-sm" />
          <div class="flex flex-col gap-2">
            <label class="text-xs text-dark/70">Type</label>
            <div class="flex gap-2">
              <button @click="sessionForm.type = 'section'"
                :class="[sessionForm.type === 'section' ? 'bg-primary text-light' : 'bg-light text-primary border-2 border-gray', 'rounded-lg px-3 py-2 text-sm font-medium flex-1']">Section</button>
              <button @click="sessionForm.type = 'rendu'"
                :class="[sessionForm.type === 'rendu' ? 'bg-secondary text-light' : 'bg-light text-secondary border-2 border-gray', 'rounded-lg px-3 py-2 text-sm font-medium flex-1']">Rendu</button>
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-dark/70">Date cible (optionnel)</label>
            <input v-model="sessionForm.dueDate" type="date" class="rounded-lg border-2 border-gray px-3 py-2 text-sm" />
          </div>
          <Button :callback="createSession">Créer</Button>
          <p v-if="sessionForm.message" :class="[sessionForm.status === 'error' ? 'text-secondary' : 'text-success', 'text-xs']">{{ sessionForm.message }}</p>
        </div>

        <div v-if="viewRole === 'prof'" class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
          <h3 class="text-lg font-semibold text-dark">Planifier un évènement</h3>
          <input v-model="eventForm.title" type="text" placeholder="Titre"
            class="w-full rounded-lg border-2 border-gray px-3 py-2 text-sm" />
          <div class="grid grid-cols-2 gap-2">
            <select v-model="eventForm.type" class="rounded-lg border-2 border-gray px-3 py-2 text-sm">
              <option value="course">Cours</option>
              <option value="ds">DS</option>
              <option value="exam">Exam</option>
              <option value="khole">Khôlle</option>
            </select>
            <input v-model="eventForm.location" type="text" placeholder="Lieu" class="rounded-lg border-2 border-gray px-3 py-2 text-sm" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <input v-model="eventForm.date" type="date" class="rounded-lg border-2 border-gray px-3 py-2 text-sm" />
            <input v-model="eventForm.time" type="time" class="rounded-lg border-2 border-gray px-3 py-2 text-sm" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <input v-model.number="eventForm.duration" type="number" min="30" step="15" class="rounded-lg border-2 border-gray px-3 py-2 text-sm" placeholder="Durée (min)" />
            <select v-model="eventForm.participants" multiple class="rounded-lg border-2 border-gray px-3 py-2 text-sm h-24">
              <option v-for="student in activeStudents" :key="student.id" :value="student.id">{{ student.name }}</option>
            </select>
          </div>
          <textarea v-model="eventForm.description" placeholder="Notes" class="w-full rounded-lg border-2 border-gray px-3 py-2 text-sm"></textarea>
          <Button :callback="createEvent">Programmer</Button>
          <p v-if="eventForm.message" :class="[eventForm.status === 'error' ? 'text-secondary' : 'text-success', 'text-xs']">{{ eventForm.message }}</p>
          <p v-if="eventForm.error" class="text-xs text-secondary">{{ eventForm.error }}</p>
        </div>

        <div class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
          <h3 class="text-lg font-semibold text-dark">Ressources partagées</h3>
          <div class="space-y-2">
            <div v-for="resource in currentGroup.resources" :key="resource.id" class="flex items-center justify-between rounded-xl border border-gray px-3 py-2">
              <div>
                <p class="text-sm font-semibold text-dark">{{ resource.title }}</p>
                <p class="text-xs text-dark/60">{{ resource.type }} · {{ formatDate(resource.updatedAt) }}</p>
              </div>
              <span class="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">{{ resource.by }}</span>
            </div>
          </div>
          <div v-if="viewRole === 'prof'" class="rounded-xl border border-dashed border-gray bg-light/60 p-3">
            <p class="text-sm font-semibold text-dark">Ajouter une ressource</p>
            <div class="mt-2 flex flex-col gap-2">
              <input v-model="resourceForm.title" type="text" placeholder="Titre du document"
                class="w-full rounded-lg border-2 border-gray px-3 py-2 text-sm" />
              <select v-model="resourceForm.type" class="rounded-lg border-2 border-gray px-3 py-2 text-sm">
                <option value="Cours">Cours</option>
                <option value="Carte mentale">Carte mentale</option>
                <option value="Sujet">Sujet/DS</option>
                <option value="Autre">Autre</option>
              </select>
              <Button :callback="shareResource">Partager</Button>
              <p v-if="resourceForm.message" :class="[resourceForm.status === 'error' ? 'text-secondary' : 'text-success', 'text-xs']">{{ resourceForm.message }}</p>
            </div>
          </div>
        </div>

        <!-- Formulaire d'invitation -->
        <div v-if="viewRole === 'prof'" class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
          <h3 class="text-lg font-semibold text-dark">Inviter un utilisateur</h3>
          <input v-model="inviteForm.targetEmail" type="email" placeholder="Email de l'utilisateur"
            class="w-full rounded-lg border-2 border-gray px-3 py-2 text-sm" />
          <div class="flex gap-2">
            <button @click="inviteForm.role = 'student'"
              :class="[inviteForm.role === 'student' ? 'bg-primary text-light' : 'bg-light text-primary border-2 border-gray', 'rounded-lg px-3 py-2 text-sm font-medium flex-1']">
              Étudiant
            </button>
            <button @click="inviteForm.role = 'teacher'"
              :class="[inviteForm.role === 'teacher' ? 'bg-primary text-light' : 'bg-light text-primary border-2 border-gray', 'rounded-lg px-3 py-2 text-sm font-medium flex-1']">
              Enseignant
            </button>
          </div>
          <Button :callback="sendInvite">Envoyer l'invitation</Button>
          <p v-if="inviteForm.message" :class="[inviteForm.status === 'error' ? 'text-secondary' : 'text-success', 'text-xs']">{{ inviteForm.message }}</p>
        </div>

        <div v-if="viewRole === 'prof'" class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
          <h3 class="text-lg font-semibold text-dark">Affecter / retirer des étudiants</h3>
          <div class="space-y-2">
            <label v-for="student in currentGroup.students" :key="student.id" class="flex items-center justify-between rounded-xl border border-gray px-3 py-2 text-sm">
              <div class="flex items-center gap-3">
                <input type="checkbox" :checked="student.active" @change="toggleStudent(student.id)" />
                <div>
                  <p class="font-semibold text-dark">{{ student.name }}</p>
                  <p class="text-xs text-dark/60">{{ student.email }}</p>
                </div>
              </div>
              <span :class="[student.active ? 'text-success bg-success/10' : 'text-secondary bg-secondary/10', 'rounded-full px-2 py-1 text-xs']">{{ student.active ? 'Affecté' : 'Retiré' }}</span>
            </label>
          </div>
          <p v-if="membershipMessage" class="text-xs text-success">{{ membershipMessage }}</p>
        </div>
      </div>
    </section>

    <section v-else class="rounded-2xl border-2 border-gray bg-white p-6 text-center text-dark/70">
      Aucune classe à afficher. Ajuste les filtres ou crée une nouvelle classe.
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import Button from '@/components/ButtonComponent.vue'
import { AcademicCapIcon, CalendarDaysIcon, DocumentIcon } from '@heroicons/vue/24/outline'
import { ArrowUpOnSquareIcon, CheckCircleIcon, ChevronRightIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/solid'
import { useAuthStore } from '@/stores/auth'
import { useRole } from '@/composables/useRole'
import { useTeacherAnalytics } from '@/composables/useTeacherAnalytics'
import { useClassGroupStore } from '@/stores/classGroups'
import { useInvitationStore } from '@/stores/invitations'

const authStore = useAuthStore()
const { isEnseignant, isAdmin, canManageGroups } = useRole()
const classGroupStore = useClassGroupStore()
const invitationStore = useInvitationStore()

const currentUserId = computed(() => authStore.user?.userId ?? null)

// Les admins peuvent basculer manuellement entre les vues ; les autres ont une vue fixe
const manualViewOverride = ref(null)

const autoViewRole = computed(() => {
  if (isAdmin.value || isEnseignant.value) return 'prof'
  return 'student'
})

const viewRole = computed(() => manualViewOverride.value ?? autoViewRole.value)

function setViewRole(val) {
  if (isAdmin.value) manualViewOverride.value = val
}

const levels = ['Prépa', 'Licence', 'Terminale']
const filters = reactive({ search: '', level: 'all' })
const selectedGroupId = ref(null)
const expandedSessions = reactive({})
const membershipMessage = ref('')
const creationMessage = ref('')
const uploadForms = reactive({})
const loading = ref(false)
const SAMPLE_PDF_URL = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'

// Données mock par défaut — remplacées par l'API au montage si disponibles
const groups = ref([
  {
    id: 'grp-mp2i',
    name: 'MP2I A',
    code: 'MP2I-A',
    level: 'Prépa',
    teacher: 'Mme Dupont',
    students: [
      { id: 'stu-1', name: 'Emma Laurent', email: 'emma@example.com', active: true },
      { id: 'stu-2', name: 'Noah Silva', email: 'noah@example.com', active: true },
      { id: 'stu-3', name: 'Lina Chen', email: 'lina@example.com', active: false },
    ],
    sessions: [
      {
        id: 'sec-1',
        title: 'Section 1',
        type: 'section',
        description: 'Notions de suites et convergence.',
        dueDate: '2026-03-01',
        resources: [
          { id: 'res-1', title: 'Cours PDF', type: 'PDF' },
          { id: 'res-2', title: 'Carte mentale Suites', type: 'Mindmap' },
        ],
        attachments: [
          { id: 'att-1', title: 'Rendu de Léa', date: '2026-02-24', url: SAMPLE_PDF_URL },
        ],
      },
      {
        id: 'ren-1',
        title: 'Rendu 1',
        type: 'rendu',
        description: 'Rendu du TD séries.',
        dueDate: '2026-03-05',
        resources: [],
        attachments: [
          { id: 'att-2', title: 'TD Séries - copie PDF', date: '2026-02-25', url: SAMPLE_PDF_URL },
        ],
      },
    ],
    resources: [
      { id: 'r-1', title: 'Plan de cours', type: 'Cours', by: 'Mme Dupont', updatedAt: '2026-02-20' },
      { id: 'r-2', title: 'Carte mentale Analyse', type: 'Carte mentale', by: 'Mme Dupont', updatedAt: '2026-02-22' },
    ],
    events: [
      { id: 'evt-1', title: 'Cours Analyse', type: 'course', start: '2026-02-28T09:00', end: '2026-02-28T11:00', location: 'Amphi 2', students: ['stu-1', 'stu-2'], status: 'ok' },
      { id: 'evt-2', title: 'DS maths', type: 'ds', start: '2026-03-02T08:00', end: '2026-03-02T10:00', location: 'Salle 12', students: ['stu-1'], status: 'ok' },
    ],
  },
  {
    id: 'grp-licence',
    name: 'Licence Info L2',
    code: 'INFO-L2',
    level: 'Licence',
    teacher: 'M. Bernard',
    students: [
      { id: 'stu-1', name: 'Emma Laurent', email: 'emma@example.com', active: true },
      { id: 'stu-4', name: 'Sami K.', email: 'sami@example.com', active: true },
    ],
    sessions: [
      {
        id: 'sec-lic-1',
        title: 'Section 1',
        type: 'section',
        description: 'POO avancée et patrons.',
        dueDate: '2026-03-04',
        resources: [{ id: 'res-lic-1', title: 'Slides POO', type: 'Slides' }],
        attachments: [],
      },
    ],
    resources: [
      { id: 'r-lic-1', title: 'Sujet TP héritage', type: 'Sujet', by: 'M. Bernard', updatedAt: '2026-02-18' },
    ],
    events: [
      { id: 'evt-lic-1', title: 'TP POO', type: 'course', start: '2026-02-27T14:00', end: '2026-02-27T16:00', location: 'Salle info', students: ['stu-1', 'stu-4'], status: 'ok' },
    ],
  },
])

const sessionForm = reactive({ title: '', type: 'section', dueDate: '', status: 'idle', message: '' })
const resourceForm = reactive({ title: '', type: 'Cours', status: 'idle', message: '' })
const eventForm = reactive({ title: '', type: 'course', date: '', time: '08:00', duration: 90, participants: [], location: '', description: '', status: 'idle', message: '', error: '' })
const inviteForm = reactive({ targetEmail: '', role: 'student', status: 'idle', message: '' })
const kpi = ref(null)
const {
  analytics, analyticsLoading, expandedAnalyticsStudents,
  currentWeekScore, atRiskStudents,
  scoreTextClass, formatShortDate, toggleStudentDetail, loadStudentAnalytics
} = useTeacherAnalytics()

onMounted(async () => {
  loading.value = true
  await Promise.all([
    classGroupStore.fetchGroups(),
    invitationStore.fetchMine()
  ])
  const apiGroups = classGroupStore.groups
  if (apiGroups.length > 0) {
    groups.value = apiGroups.map((g) => ({
      ...g,
      code: g.code ?? null,
      level: g.level ?? null,
      teacher: null,
      students: (g.members ?? [])
        .filter((m) => m.role === 'student')
        .map((m) => ({ id: m.userId, name: `Étudiant #${m.userId}`, email: '', active: true })),
      sessions: [],
      resources: [],
      events: [],
    }))
    if (!isAdmin.value && !isEnseignant.value && currentUserId.value) {
      const firstGroup = apiGroups[0]
      const membership = firstGroup?.members?.find((m) => m.userId === currentUserId.value)
      if (membership?.role === 'teacher') manualViewOverride.value = 'prof'
    }
  }
  loading.value = false
})

const pendingInvitations = computed(() => invitationStore.mine)

watch(groups, (list) => {
  if (!selectedGroupId.value && list.length) {
    selectedGroupId.value = list[0].id
  }
}, { immediate: true })

const filteredGroups = computed(() => {
  const search = filters.search.toLowerCase()
  return groups.value.filter((group) => {
    const matchSearch = group.name.toLowerCase().includes(search) || (group.code ?? '').toLowerCase().includes(search)
    const matchLevel = filters.level === 'all' || group.level === filters.level
    const matchRole = viewRole.value === 'prof' || group.students.some((s) => s.id === currentUserId.value && s.active)
    return matchSearch && matchLevel && matchRole
  })
})

watch(filteredGroups, (list) => {
  if (!list.find((g) => g.id === selectedGroupId.value)) {
    selectedGroupId.value = list[0]?.id || null
  }
})

const currentGroup = computed(() => groups.value.find((g) => g.id === selectedGroupId.value))
const activeStudents = computed(() => currentGroup.value?.students.filter((s) => s.active) || [])

const sortedEvents = computed(() => {
  if (!currentGroup.value) return []
  return [...currentGroup.value.events].sort((a, b) => new Date(a.start) - new Date(b.start))
})

const nextCourse = computed(() => getNextEvent(currentGroup.value, 'course'))
const nextDs = computed(() => getNextEvent(currentGroup.value, 'ds'))
const nextForStudent = computed(() => {
  if (!currentGroup.value) return null
  return currentGroup.value.events
    .filter((evt) => evt.students.includes(currentUserId.value) && new Date(evt.start) > new Date())
    .sort((a, b) => new Date(a.start) - new Date(b.start))[0]
})

function selectGroup(id) {
  selectedGroupId.value = id
}

function toggleSession(id) {
  expandedSessions[id] = !expandedSessions[id]
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTimeRange(start, end) {
  if (!start || !end) return ''
  const opts = { hour: '2-digit', minute: '2-digit' }
  return `${new Date(start).toLocaleTimeString('fr-FR', opts)} - ${new Date(end).toLocaleTimeString('fr-FR', opts)}`
}

function getNextEvent(group, type) {
  if (!group) return null
  return group.events
    .filter((evt) => evt.type === type && new Date(evt.start) > new Date())
    .sort((a, b) => new Date(a.start) - new Date(b.start))[0]
}

function badgeForEvent(type) {
  switch (type) {
    case 'ds':
      return 'rounded-full bg-secondary/10 px-2 py-1 text-xs text-secondary'
    case 'exam':
      return 'rounded-full bg-warning/10 px-2 py-1 text-xs text-warning'
    case 'khole':
      return 'rounded-full bg-primary/10 px-2 py-1 text-xs text-primary'
    default:
      return 'rounded-full bg-primary/10 px-2 py-1 text-xs text-primary'
  }
}

function getUploadForm(sessionId) {
  if (!uploadForms[sessionId]) {
    uploadForms[sessionId] = { title: '', status: '' }
  }
  return uploadForms[sessionId]
}

function labelForEvent(type) {
  switch (type) {
    case 'ds': return 'DS'
    case 'exam': return 'Exam'
    case 'khole': return 'Khôlle'
    default: return 'Cours'
  }
}

function createSession() {
  if (!currentGroup.value) return
  if (!sessionForm.title) {
    sessionForm.status = 'error'
    sessionForm.message = 'Le nom est requis.'
    return
  }
  currentGroup.value.sessions.push({
    id: `sec-${Date.now()}`,
    title: sessionForm.title,
    type: sessionForm.type,
    description: sessionForm.type === 'section' ? 'Section ajoutée .' : 'Rendu ajouté .',
    dueDate: sessionForm.dueDate,
    resources: [],
    attachments: [],
  })
  sessionForm.status = 'success'
  sessionForm.message = 'Section créée.'
  sessionForm.title = ''
  sessionForm.dueDate = ''
}

function shareResource() {
  if (!currentGroup.value) return
  if (!resourceForm.title) {
    resourceForm.status = 'error'
    resourceForm.message = 'Titre requis.'
    return
  }
  currentGroup.value.resources.unshift({
    id: `r-${Date.now()}`,
    title: resourceForm.title,
    type: resourceForm.type,
    by: 'Vous',
    updatedAt: new Date().toISOString(),
  })
  resourceForm.status = 'success'
  resourceForm.message = 'Ressource ajoutée .'
  resourceForm.title = ''
}

function attachDocument(sessionId) {
  if (!currentGroup.value) return
  const session = currentGroup.value.sessions.find((s) => s.id === sessionId)
  if (!session) return
  const form = getUploadForm(sessionId)
  const title = form.title?.trim() || 'Document sans titre'
  session.attachments.push({
    id: `att-${Date.now()}`,
    title,
    date: new Date().toISOString(),
    url: SAMPLE_PDF_URL,
  })
  form.status = ''
  form.title = ''
}

function createEvent() {
  if (!currentGroup.value) return
  eventForm.message = ''
  eventForm.error = ''
  if (!eventForm.title || !eventForm.date || !eventForm.time) {
    eventForm.status = 'error'
    eventForm.message = 'Titre, date et heure sont requis.'
    return
  }
  const start = new Date(`${eventForm.date}T${eventForm.time}`)
  const end = new Date(start.getTime() + (eventForm.duration || 60) * 60000)
  const conflict = detectConflict(start, end, eventForm.participants)
  if (conflict) {
    eventForm.status = 'error'
    eventForm.error = `Conflit avec ${conflict.title} (${formatTimeRange(conflict.start, conflict.end)}).`
    return
  }
  currentGroup.value.events.push({
    id: `evt-${Date.now()}`,
    title: eventForm.title,
    type: eventForm.type,
    start: start.toISOString(),
    end: end.toISOString(),
    location: eventForm.location || 'A préciser',
    students: eventForm.participants.length ? eventForm.participants : activeStudents.value.map((s) => s.id),
    status: 'ok',
  })
  eventForm.status = 'success'
  eventForm.message = 'Evènement ajouté .'
  eventForm.title = ''
  eventForm.location = ''
  eventForm.description = ''
  eventForm.participants = []
}

function detectConflict(start, end, participants) {
  if (!currentGroup.value) return false
  return currentGroup.value.events.find((evt) => {
    const evtStart = new Date(evt.start)
    const evtEnd = new Date(evt.end)
    const overlap = start < evtEnd && end > evtStart
    const sameStudent = !participants.length || evt.students.some((id) => participants.includes(id))
    return overlap && sameStudent
  })
}

async function toggleStudent(id) {
  if (!currentGroup.value) return
  const student = currentGroup.value.students.find((s) => s.id === id)
  if (!student) return
  if (student.active) {
    const ok = await classGroupStore.removeMember(currentGroup.value.id, id)
    if (ok) {
      student.active = false
      membershipMessage.value = 'Étudiant retiré.'
    }
  } else {
    const ok = await classGroupStore.addMember(currentGroup.value.id, id)
    if (ok) {
      student.active = true
      membershipMessage.value = 'Étudiant affecté.'
    }
  }
}

async function sendInvite() {
  if (!currentGroup.value || !inviteForm.targetEmail) {
    inviteForm.status = 'error'
    inviteForm.message = "L'adresse email est requise."
    return
  }
  const ok = await invitationStore.invite(currentGroup.value.id, {
    targetEmail: inviteForm.targetEmail,
    role: inviteForm.role
  })
  inviteForm.status = ok ? 'success' : 'error'
  inviteForm.message = ok ? 'Envoi réussi.' : "Erreur lors de l'envoi."
  if (ok) {
    inviteForm.targetEmail = ''
    await invitationStore.fetchByGroup(currentGroup.value.id)
  }
}

async function respondInvitation(id, status) {
  await invitationStore.respond(id, status)
}

async function loadKpi(groupId) {
  const { api } = await import('@/helpers/api')
  const resp = await api.get(`class-groups/${groupId}/kpi`)
  kpi.value = resp?.status === 200 ? resp.data.data : null
}

watch(selectedGroupId, (id) => {
  if (id && (isAdmin.value || isEnseignant.value)) {
    loadKpi(id)
    loadStudentAnalytics(id)
  }
})

function warnNoBackend() {
  creationMessage.value = ''
}
</script>
