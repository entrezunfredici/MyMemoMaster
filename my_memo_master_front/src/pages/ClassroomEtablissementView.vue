<template>
  <div class="space-y-6">

    <!-- Navigation onglets -->
    <div class="flex gap-1 border-b border-gray">
      <button v-for="tab in tabs" :key="tab.key"
        @click="switchTab(tab.key)"
        :class="[activeTab === tab.key
          ? 'border-b-2 border-primary text-primary font-semibold'
          : 'text-dark/60 hover:text-dark', 'pb-2 px-3 text-sm transition']">
        {{ tab.label }}
      </button>
    </div>

    <!-- Onglet Stats -->
    <template v-if="activeTab === 'stats'">
      <div v-if="loadingStats" class="text-sm text-dark/60">Chargement...</div>
      <div v-else-if="!etabStore.stats" class="text-sm text-dark/60">Aucune donnée disponible.</div>
      <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="rounded-xl border border-gray bg-white p-3 text-center">
          <p class="text-2xl font-bold text-primary">{{ etabStore.stats.groupCount }}</p>
          <p class="text-xs text-dark/60 mt-1">Groupes</p>
        </div>
        <div class="rounded-xl border border-gray bg-white p-3 text-center">
          <p class="text-2xl font-bold text-primary">{{ etabStore.stats.totalMembers }}</p>
          <p class="text-xs text-dark/60 mt-1">Membres</p>
        </div>
        <div class="rounded-xl border border-gray bg-white p-3 text-center">
          <p class="text-2xl font-bold text-success">{{ etabStore.stats.activeMembers }}</p>
          <p class="text-xs text-dark/60 mt-1">Actifs</p>
        </div>
        <div class="rounded-xl border border-gray bg-white p-3 text-center">
          <p class="text-2xl font-bold text-secondary">{{ etabStore.stats.pendingInvitations }}</p>
          <p class="text-xs text-dark/60 mt-1">Invitations en attente</p>
        </div>
        <div class="rounded-xl border border-gray bg-white p-3 text-center">
          <p class="text-2xl font-bold text-dark">{{ etabStore.stats.validatedAccounts }}</p>
          <p class="text-xs text-dark/60 mt-1">Emails vérifiés</p>
        </div>
        <div class="rounded-xl border border-gray bg-white p-3 text-center">
          <p class="text-2xl font-bold text-dark">{{ etabStore.stats.roleBreakdown?.students ?? 0 }}</p>
          <p class="text-xs text-dark/60 mt-1">Étudiants</p>
        </div>
        <div class="rounded-xl border border-gray bg-white p-3 text-center">
          <p class="text-2xl font-bold text-dark">{{ etabStore.stats.roleBreakdown?.teachers ?? 0 }}</p>
          <p class="text-xs text-dark/60 mt-1">Enseignants</p>
        </div>
        <div class="rounded-xl border border-gray bg-white p-3 text-center">
          <p class="text-2xl font-bold text-dark">{{ etabStore.stats.inactiveMembers }}</p>
          <p class="text-xs text-dark/60 mt-1">Inactifs</p>
        </div>
      </div>
    </template>

    <!-- Onglet Journal -->
    <template v-if="activeTab === 'audit'">
      <div class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
        <h2 class="text-lg font-semibold text-dark">Journal d'activité</h2>
        <div class="flex flex-wrap gap-2">
          <input v-model="auditFilters.action" type="text" placeholder="Action (ex: USER_INVITED)"
            class="rounded-lg border border-gray px-3 py-1.5 text-sm" />
          <input v-model="auditFilters.limit" type="number" placeholder="Limite (défaut 100)"
            class="rounded-lg border border-gray px-3 py-1.5 text-sm w-36" />
          <button @click="reloadAudit"
            class="rounded-lg bg-primary/10 px-3 py-1.5 text-sm text-primary hover:bg-primary/20 transition">
            Filtrer
          </button>
        </div>
        <div v-if="etabStore.audit.length === 0" class="text-sm text-dark/60">Aucune entrée.</div>
        <div v-else class="space-y-1 max-h-96 overflow-y-auto">
          <div v-for="log in etabStore.audit" :key="log.id"
            class="rounded-lg border border-gray/50 px-3 py-2 text-xs flex items-center justify-between gap-2">
            <span class="font-mono text-primary font-semibold truncate">{{ log.action }}</span>
            <span class="text-dark/70">{{ log.entityType }} #{{ log.entityId ?? '—' }}</span>
            <span class="text-dark/50">{{ log.actor?.name ?? '—' }}</span>
            <span class="text-dark/40 shrink-0">{{ formatDate(log.createdAt) }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- Onglet Contenu -->
    <template v-if="activeTab === 'content'">
      <div class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-4">
        <h2 class="text-lg font-semibold text-dark">Modération du contenu</h2>
        <div v-if="!etabStore.content" class="text-sm text-dark/60">Chargement...</div>
        <template v-else>
          <div class="space-y-2">
            <p class="text-sm font-semibold text-dark">Ressources ({{ etabStore.content.resources?.length ?? 0 }})</p>
            <div v-if="!etabStore.content.resources?.length" class="text-xs text-dark/50">Aucune ressource.</div>
            <div v-for="r in etabStore.content.resources" :key="r.id"
              class="rounded-lg border border-gray/50 px-3 py-2 text-xs flex items-center justify-between gap-2">
              <div class="min-w-0">
                <p class="font-medium text-dark truncate">{{ r.title }}</p>
                <p class="text-dark/50">{{ r.classGroup?.name }} · {{ r.type }} · {{ r.creator?.name }}</p>
              </div>
              <button @click="confirmDeleteContent('resource', r.id, r.title)"
                class="shrink-0 rounded-lg bg-secondary/10 px-2 py-1 text-secondary hover:bg-secondary/20 transition">
                Supprimer
              </button>
            </div>
          </div>
          <div class="space-y-2">
            <p class="text-sm font-semibold text-dark">Sections ({{ etabStore.content.sections?.length ?? 0 }})</p>
            <div v-if="!etabStore.content.sections?.length" class="text-xs text-dark/50">Aucune section.</div>
            <div v-for="s in etabStore.content.sections" :key="s.id"
              class="rounded-lg border border-gray/50 px-3 py-2 text-xs flex items-center justify-between gap-2">
              <div class="min-w-0">
                <p class="font-medium text-dark truncate">{{ s.title }}</p>
                <p class="text-dark/50">{{ s.classGroup?.name }} · {{ s.type }} · {{ s.creator?.name }}</p>
              </div>
              <button @click="confirmDeleteContent('section', s.id, s.title)"
                class="shrink-0 rounded-lg bg-secondary/10 px-2 py-1 text-secondary hover:bg-secondary/20 transition">
                Supprimer
              </button>
            </div>
          </div>
        </template>
      </div>
    </template>

    <!-- Onglet Comptes -->
    <template v-if="activeTab === 'comptes'">
      <div class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
        <h2 class="text-lg font-semibold text-dark">Gestion des comptes</h2>
        <p class="text-xs text-dark/60">Membres du groupe sélectionné. Sélectionnez un groupe dans l'onglet Groupes.</p>
        <div v-if="!currentGroup" class="text-sm text-dark/60">Aucun groupe sélectionné.</div>
        <div v-else class="space-y-2">
          <div v-for="m in currentGroup.members" :key="m.userId"
            class="rounded-xl border border-gray px-3 py-2 flex items-center justify-between text-sm">
            <div>
              <p class="font-semibold text-dark">{{ m.user?.name ?? `#${m.userId}` }}</p>
              <p class="text-xs text-dark/60">{{ m.user?.email }}</p>
            </div>
            <div class="flex items-center gap-2">
              <span :class="m.user?.isActive === false ? 'bg-secondary/10 text-secondary' : 'bg-success/10 text-success'"
                class="rounded-full px-2 py-0.5 text-xs font-medium">
                {{ m.user?.isActive === false ? 'Inactif' : 'Actif' }}
              </span>
              <button v-if="m.user?.isActive !== false" @click="deactivate(m.userId)"
                class="rounded-lg border border-secondary/40 px-2 py-1 text-xs text-secondary hover:bg-secondary/10 transition">
                Désactiver
              </button>
              <button v-else @click="activate(m.userId)"
                class="rounded-lg border border-success/40 px-2 py-1 text-xs text-success hover:bg-success/10 transition">
                Activer
              </button>
            </div>
          </div>
          <p v-if="!currentGroup.members?.length" class="text-xs text-dark/60">Aucun membre.</p>
        </div>
      </div>
    </template>

    <!-- Onglet Groupes (contenu existant) -->
    <template v-if="activeTab === 'groupes'">

    <!-- Bandeau groupes -->
    <section class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-dark">Groupes classes</h2>
        <button @click="showCreateGroup = !showCreateGroup"
          class="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-light hover:bg-primary/90 transition">
          + Nouvelle classe
        </button>
      </div>

      <!-- Formulaire création groupe -->
      <div v-if="showCreateGroup" class="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-3">
        <h3 class="text-sm font-semibold text-primary">Nouvelle classe</h3>
        <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
          <input v-model="createGroupForm.name" type="text" placeholder="Nom *"
            class="rounded-lg border-2 border-gray px-3 py-2 text-sm" />
          <input v-model="createGroupForm.code" type="text" placeholder="Code (ex: MP2I-A)"
            class="rounded-lg border-2 border-gray px-3 py-2 text-sm" />
          <input v-model="createGroupForm.level" type="text" placeholder="Niveau (ex: Prépa)"
            class="rounded-lg border-2 border-gray px-3 py-2 text-sm" />
          <input v-model="createGroupForm.description" type="text" placeholder="Description"
            class="rounded-lg border-2 border-gray px-3 py-2 text-sm" />
        </div>
        <div class="flex gap-2">
          <button @click="submitCreateGroup"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-light hover:bg-primary/90 transition">Créer</button>
          <button @click="showCreateGroup = false"
            class="rounded-lg border border-gray px-4 py-2 text-sm hover:bg-light transition">Annuler</button>
        </div>
        <p v-if="createGroupForm.error" class="text-xs text-secondary">{{ createGroupForm.error }}</p>
      </div>

      <!-- Liste des groupes -->
      <div class="flex gap-3 overflow-x-auto pb-1">
        <div v-for="g in classGroupStore.groups" :key="g.id"
          @click="selectGroup(g.id)"
          :class="[selectedId === g.id ? 'border-primary bg-light/70' : 'border-gray', 'min-w-[220px] cursor-pointer rounded-xl border-2 p-3 shadow-sm transition hover:-translate-y-0.5']">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-xs text-dark/60 uppercase tracking-wide">{{ g.level }}</p>
              <p class="text-lg font-semibold text-primary">{{ g.name }}</p>
              <p class="text-xs text-dark/60">{{ g.code }}</p>
            </div>
            <button @click.stop="confirmDeleteGroup(g)" class="text-secondary hover:text-secondary/70 text-lg leading-none">×</button>
          </div>
          <p class="mt-2 text-xs text-dark/60">{{ g.members?.length ?? 0 }} membres</p>
        </div>
        <p v-if="classGroupStore.groups.length === 0" class="text-sm text-dark/60">Aucun groupe. Créez-en un.</p>
      </div>
    </section>

    <template v-if="currentGroup">
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">

        <!-- Emploi du temps -->
        <div class="space-y-4 lg:col-span-2">
          <section class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-4">
            <h2 class="text-lg font-semibold text-dark">Emploi du temps — {{ currentGroup.name }}</h2>

            <!-- Formulaire création d'événement récurrent -->
            <div class="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
              <h3 class="text-sm font-semibold text-primary">Nouveau créneau</h3>
              <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
                <input v-model="eventForm.name" type="text" placeholder="Nom *"
                  class="rounded-lg border-2 border-gray px-3 py-2 text-sm" />
                <select v-model="eventForm.type" class="rounded-lg border-2 border-gray px-3 py-2 text-sm bg-white">
                  <option value="cours">Cours</option>
                  <option value="examen">Examen</option>
                  <option value="autre">Autre</option>
                </select>
              </div>

              <!-- Mode récurrence -->
              <div class="flex gap-2">
                <button @click="eventForm.recurrenceMode = 'auto'"
                  :class="[eventForm.recurrenceMode === 'auto' ? 'bg-primary text-light' : 'bg-light text-primary border-2 border-gray', 'rounded-lg px-3 py-2 text-sm flex-1']">
                  Récurrent
                </button>
                <button @click="eventForm.recurrenceMode = 'manual'"
                  :class="[eventForm.recurrenceMode === 'manual' ? 'bg-primary text-light' : 'bg-light text-primary border-2 border-gray', 'rounded-lg px-3 py-2 text-sm flex-1']">
                  Séance unique
                </button>
              </div>

              <!-- Récurrence automatique -->
              <template v-if="eventForm.recurrenceMode === 'auto'">
                <select v-model="eventForm.frequency" class="w-full rounded-lg border-2 border-gray px-3 py-2 text-sm bg-white">
                  <option value="weekly">Hebdomadaire</option>
                  <option value="biweekly">Bi-hebdomadaire</option>
                  <option value="monthly">Mensuel</option>
                </select>
                <div class="flex flex-wrap gap-2" v-if="eventForm.frequency !== 'monthly'">
                  <label v-for="day in weekDays" :key="day.value" class="flex items-center gap-1 text-sm cursor-pointer">
                    <input type="checkbox" :value="day.value" v-model="eventForm.days" class="rounded" />
                    {{ day.label }}
                  </label>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-xs text-dark/60">Début de période</label>
                    <input v-model="eventForm.startDate" type="date" class="w-full rounded-lg border-2 border-gray px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label class="text-xs text-dark/60">Fin de période</label>
                    <input v-model="eventForm.endDate" type="date" class="w-full rounded-lg border-2 border-gray px-3 py-2 text-sm" />
                  </div>
                </div>
              </template>

              <!-- Séance unique -->
              <template v-else>
                <div>
                  <label class="text-xs text-dark/60">Date</label>
                  <input v-model="eventForm.date" type="date" class="w-full rounded-lg border-2 border-gray px-3 py-2 text-sm" />
                </div>
              </template>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="text-xs text-dark/60">Heure début</label>
                  <input v-model="eventForm.startTime" type="time" class="w-full rounded-lg border-2 border-gray px-3 py-2 text-sm" />
                </div>
                <div>
                  <label class="text-xs text-dark/60">Heure fin</label>
                  <input v-model="eventForm.endTime" type="time" class="w-full rounded-lg border-2 border-gray px-3 py-2 text-sm" />
                </div>
              </div>

              <button @click="submitEvent"
                class="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-light hover:bg-primary/90 transition">
                Créer le créneau
              </button>
              <p v-if="eventForm.error" class="text-xs text-secondary">{{ eventForm.error }}</p>
              <p v-if="eventForm.success" class="text-xs text-success">{{ eventForm.success }}</p>
            </div>

            <!-- Liste des événements existants -->
            <div v-if="loadingEvents" class="text-sm text-dark/60">Chargement...</div>
            <div v-else-if="calendarStore.groupEvents.length === 0" class="text-sm text-dark/60">Aucun créneau planifié.</div>
            <div v-else class="space-y-2">
              <div v-for="ev in calendarStore.groupEvents" :key="ev.id"
                class="rounded-xl border border-gray px-4 py-3">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="flex items-center gap-2">
                      <span :class="ev.type === 'examen' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'"
                        class="rounded-full px-2 py-0.5 text-xs font-semibold uppercase">
                        {{ ev.type === 'examen' ? 'Examen' : ev.type === 'autre' ? 'Autre' : 'Cours' }}
                      </span>
                      <p class="text-sm font-semibold text-dark">{{ ev.name }}</p>
                    </div>
                    <p class="text-xs text-dark/60 mt-0.5">{{ ev.occurrences?.length ?? 0 }} séance(s)</p>
                  </div>
                  <button @click="deleteGroupEvent(ev.id)" class="text-secondary text-xs hover:underline">Supprimer</button>
                </div>
                <div v-if="ev.occurrences?.length" class="mt-2 flex flex-wrap gap-1">
                  <span v-for="occ in ev.occurrences.slice(0, 5)" :key="occ.id"
                    class="rounded-full bg-gray px-2 py-0.5 text-xs text-dark/70">
                    {{ formatDate(occ.date) }} {{ occ.startTime?.slice(0,5) }}
                  </span>
                  <span v-if="ev.occurrences.length > 5" class="text-xs text-dark/40">+{{ ev.occurrences.length - 5 }}</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- Gestion membres + invitations -->
        <div class="space-y-4">

          <!-- Inviter -->
          <div class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
            <h3 class="text-base font-semibold text-dark">Inviter</h3>
            <input v-model="inviteForm.targetEmail" type="email" placeholder="Email *"
              class="w-full rounded-lg border-2 border-gray px-3 py-2 text-sm" />
            <div class="flex gap-2">
              <button @click="inviteForm.role = 'student'"
                :class="[inviteForm.role === 'student' ? 'bg-primary text-light' : 'bg-light text-primary border-2 border-gray', 'rounded-lg px-3 py-2 text-sm flex-1']">
                Étudiant
              </button>
              <button @click="inviteForm.role = 'teacher'"
                :class="[inviteForm.role === 'teacher' ? 'bg-primary text-light' : 'bg-light text-primary border-2 border-gray', 'rounded-lg px-3 py-2 text-sm flex-1']">
                Enseignant
              </button>
            </div>
            <button @click="submitInvite"
              class="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-light hover:bg-primary/90 transition">
              Envoyer l'invitation
            </button>
            <p v-if="inviteForm.message" :class="inviteForm.error ? 'text-secondary' : 'text-success'" class="text-xs">{{ inviteForm.message }}</p>
          </div>

          <!-- Liste membres -->
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
                  <select :value="m.role" @change="changeRole(m.userId, $event.target.value)"
                    class="rounded-lg border border-gray px-2 py-1 text-xs bg-white">
                    <option value="student">Étudiant</option>
                    <option value="teacher">Enseignant</option>
                  </select>
                  <button @click="classGroupStore.removeMember(selectedId, m.userId)" class="text-secondary text-xs hover:underline">×</button>
                </div>
              </div>
            </div>

            <!-- Invitations en attente -->
            <div v-if="invitationStore.groupInvitations.length > 0" class="pt-2 border-t border-gray space-y-1">
              <p class="text-xs font-semibold text-dark/60 uppercase tracking-wide">En attente</p>
              <div v-for="inv in invitationStore.groupInvitations" :key="inv.id"
                class="rounded-xl border border-gray/50 px-3 py-2 flex items-center justify-between text-xs text-dark/70">
                <span>{{ inv.targetEmail }}</span>
                <span class="rounded-full bg-gray px-2 py-0.5">{{ inv.role === 'teacher' ? 'Enseignant' : 'Étudiant' }}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </template>

    <div v-else class="rounded-2xl border-2 border-gray bg-white p-6 text-center text-dark/70">
      Sélectionnez un groupe pour gérer son emploi du temps et ses membres.
    </div>

    </template>
    <!-- fin onglet Groupes -->

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, reactive } from 'vue'
import { useClassGroupStore } from '@/stores/classGroups'
import { useCalendarEventStore } from '@/stores/calendarEvents'
import { useInvitationStore } from '@/stores/invitations'
import { useEtablissementStore } from '@/stores/etablissement'
import { useRole } from '@/composables/useRole'

const classGroupStore = useClassGroupStore()
const calendarStore = useCalendarEventStore()
const invitationStore = useInvitationStore()
const etabStore = useEtablissementStore()
const { isAdminEtablissement } = useRole()

// ── Onglets ────────────────────────────────────────────────────────────────

// Seul roleId=4 a accès aux onglets d'administration de l'établissement
const tabs = computed(() => {
  if (isAdminEtablissement.value) {
    return [
      { key: 'groupes', label: 'Groupes' },
      { key: 'stats', label: 'Statistiques' },
      { key: 'audit', label: 'Journal' },
      { key: 'content', label: 'Contenu' },
      { key: 'comptes', label: 'Comptes' },
    ]
  }
  return [{ key: 'groupes', label: 'Groupes' }]
})
const activeTab = ref('groupes')
const loadingStats = ref(false)
const auditFilters = reactive({ action: '', limit: '' })

let etabId = null

async function switchTab(key) {
  activeTab.value = key
  if (!etabId) return
  if (key === 'stats' && !etabStore.stats) {
    loadingStats.value = true
    await etabStore.fetchStats(etabId)
    loadingStats.value = false
  }
  if (key === 'audit' && !etabStore.audit.length) await etabStore.fetchAudit(etabId)
  if (key === 'content' && !etabStore.content) await etabStore.fetchContent(etabId)
}

async function reloadAudit() {
  if (!etabId) return
  await etabStore.fetchAudit(etabId, {
    action: auditFilters.action || undefined,
    limit: auditFilters.limit || undefined,
  })
}

async function confirmDeleteContent(type, id, title) {
  if (!confirm(`Supprimer "${title}" ? Cette action est irréversible.`)) return
  await etabStore.deleteContent(etabId, type, id)
}

async function activate(userId) {
  const ok = await etabStore.activateUser(userId)
  if (ok) {
    const member = currentGroup.value?.members?.find((m) => m.userId === userId)
    if (member?.user) member.user.isActive = true
  }
}

async function deactivate(userId) {
  const ok = await etabStore.deactivateUser(userId)
  if (ok) {
    const member = currentGroup.value?.members?.find((m) => m.userId === userId)
    if (member?.user) member.user.isActive = false
  }
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const selectedId = ref(null)
const loadingEvents = ref(false)
const showCreateGroup = ref(false)

const weekDays = [
  { label: 'Lun', value: 'monday' },
  { label: 'Mar', value: 'tuesday' },
  { label: 'Mer', value: 'wednesday' },
  { label: 'Jeu', value: 'thursday' },
  { label: 'Ven', value: 'friday' },
  { label: 'Sam', value: 'saturday' },
]

const currentGroup = computed(() => classGroupStore.groups.find((g) => g.id === selectedId.value))

const createGroupForm = reactive({ name: '', code: '', level: '', description: '', error: '' })
const eventForm = reactive({
  name: '', type: 'cours', recurrenceMode: 'auto',
  frequency: 'weekly', days: ['monday'], startDate: '', endDate: '',
  date: '', startTime: '09:00', endTime: '11:00',
  error: '', success: ''
})
const inviteForm = reactive({ targetEmail: '', role: 'student', message: '', error: false })

async function selectGroup(id) {
  selectedId.value = id
  loadingEvents.value = true
  await Promise.all([
    calendarStore.fetchByGroup(id),
    invitationStore.fetchByGroup(id),
    classGroupStore.fetchGroupById(id),
  ])
  loadingEvents.value = false
}

onMounted(async () => {
  if (!classGroupStore.groups.length) await classGroupStore.fetchGroups()
  if (classGroupStore.groups.length) selectGroup(classGroupStore.groups[0].id)

  // Résoudre l'ID de l'établissement pour les onglets Stats/Journal/Contenu (roleId=4 uniquement)
  if (isAdminEtablissement.value) {
    const etab = await etabStore.fetchMine()
    if (etab?.id) etabId = etab.id
  }
})

watch(() => classGroupStore.groups, (list) => {
  if (!selectedId.value && list.length) selectGroup(list[0].id)
})

async function submitCreateGroup() {
  createGroupForm.error = ''
  if (!createGroupForm.name.trim()) { createGroupForm.error = 'Le nom est requis.'; return }
  const created = await classGroupStore.createGroup({
    name: createGroupForm.name.trim(),
    code: createGroupForm.code.trim() || null,
    level: createGroupForm.level.trim() || null,
    description: createGroupForm.description.trim() || null,
  })
  if (created) {
    showCreateGroup.value = false
    Object.assign(createGroupForm, { name: '', code: '', level: '', description: '', error: '' })
  }
}

async function confirmDeleteGroup(g) {
  if (!confirm(`Supprimer le groupe "${g.name}" ? Cette action est irréversible.`)) return
  const ok = await classGroupStore.deleteGroup(g.id)
  if (ok && selectedId.value === g.id) selectedId.value = classGroupStore.groups[0]?.id ?? null
}

async function submitEvent() {
  eventForm.error = ''
  eventForm.success = ''
  if (!eventForm.name.trim()) { eventForm.error = 'Le nom est requis.'; return }
  if (!eventForm.startTime || !eventForm.endTime) { eventForm.error = "L'heure de début et de fin sont requises."; return }

  let payload = {
    name: eventForm.name.trim(),
    type: eventForm.type,
    classGroupId: selectedId.value,
    recurrenceMode: eventForm.recurrenceMode,
  }

  if (eventForm.recurrenceMode === 'auto') {
    if (!eventForm.startDate || !eventForm.endDate) { eventForm.error = 'Les dates de début et fin de période sont requises.'; return }
    if (eventForm.frequency !== 'monthly' && eventForm.days.length === 0) { eventForm.error = 'Sélectionnez au moins un jour.'; return }
    payload.recurrenceRule = {
      frequency: eventForm.frequency,
      days: eventForm.frequency !== 'monthly' ? eventForm.days : undefined,
      startDate: eventForm.startDate,
      endDate: eventForm.endDate,
      startTime: eventForm.startTime,
      endTime: eventForm.endTime,
    }
  } else {
    if (!eventForm.date) { eventForm.error = 'La date est requise.'; return }
    payload.occurrences = [{ date: eventForm.date, startTime: eventForm.startTime, endTime: eventForm.endTime }]
  }

  const ok = await calendarStore.createEvent(payload)
  if (ok) {
    eventForm.success = 'Créneau créé avec succès.'
    eventForm.name = ''
    eventForm.date = ''
    await calendarStore.fetchByGroup(selectedId.value, true)
  }
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
    await classGroupStore.fetchGroupById(selectedId.value)
  }
}

async function changeRole(userId, role) {
  await classGroupStore.updateMemberRole(selectedId.value, userId, role)
}

async function deleteGroupEvent(eventId) {
  await calendarStore.deleteEvent(eventId)
  await calendarStore.fetchByGroup(selectedId.value, true)
}
</script>
