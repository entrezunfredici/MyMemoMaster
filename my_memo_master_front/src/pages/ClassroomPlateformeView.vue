<template>
  <div class="space-y-6">

    <!-- Liste des établissements -->
    <section class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-dark">Établissements</h2>
        <button @click="showCreate = !showCreate"
          class="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-light hover:bg-primary/90 transition">
          + Nouveau
        </button>
      </div>

      <!-- Formulaire création -->
      <div v-if="showCreate" class="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-3">
        <h3 class="text-sm font-semibold text-primary">Nouvel établissement</h3>
        <div class="grid grid-cols-1 gap-2 md:grid-cols-3">
          <input v-model="createForm.name" type="text" placeholder="Nom *"
            class="rounded-lg border-2 border-gray px-3 py-2 text-sm" />
          <input v-model="createForm.code" type="text" placeholder="Code (ex: ETAB01) *"
            class="rounded-lg border-2 border-gray px-3 py-2 text-sm" />
        </div>
        <p v-if="createForm.error" class="text-xs text-secondary">{{ createForm.error }}</p>
        <div class="flex gap-2">
          <button @click="submitCreate"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-light hover:bg-primary/90 transition">
            Créer
          </button>
          <button @click="showCreate = false"
            class="rounded-lg border border-gray px-4 py-2 text-sm hover:bg-light transition">
            Annuler
          </button>
        </div>
      </div>

      <!-- Tableau établissements -->
      <div v-if="etabStore.loading" class="text-sm text-dark/60">Chargement...</div>
      <div v-else-if="etabStore.list.length === 0" class="text-sm text-dark/60">Aucun établissement.</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray text-left text-xs text-dark/60 uppercase tracking-wide">
              <th class="pb-2 pr-4">Nom</th>
              <th class="pb-2 pr-4">Code</th>
              <th class="pb-2 pr-4">Gérant</th>
              <th class="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="etab in etabStore.list" :key="etab.id"
              :class="['border-b border-gray/50 hover:bg-light/50 transition', selectedId === etab.id ? 'bg-primary/5' : '']">
              <td class="py-2 pr-4 font-medium text-dark">{{ etab.name }}</td>
              <td class="py-2 pr-4 text-dark/70 font-mono text-xs">{{ etab.code }}</td>
              <td class="py-2 pr-4 text-dark/70">
                {{ etab.admin ? `${etab.admin.name} (${etab.admin.email})` : '—' }}
              </td>
              <td class="py-2">
                <div class="flex items-center gap-2">
                  <button @click="selectEtab(etab.id)"
                    class="rounded-lg bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20 transition">
                    Détail
                  </button>
                  <button @click="openEdit(etab)"
                    class="rounded-lg border border-gray px-2 py-1 text-xs hover:bg-light transition">
                    Modifier
                  </button>
                  <button @click="confirmDelete(etab)"
                    class="rounded-lg bg-secondary/10 px-2 py-1 text-xs text-secondary hover:bg-secondary/20 transition">
                    Supprimer
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Modale édition -->
    <div v-if="editForm.visible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-dark/40 backdrop-blur-sm">
      <div class="w-full max-w-md rounded-2xl border-2 border-gray bg-white p-6 shadow-xl space-y-4">
        <h3 class="text-lg font-semibold text-dark">Modifier l'établissement</h3>
        <div class="space-y-2">
          <input v-model="editForm.name" type="text" placeholder="Nom"
            class="w-full rounded-lg border-2 border-gray px-3 py-2 text-sm" />
          <input v-model="editForm.code" type="text" placeholder="Code"
            class="w-full rounded-lg border-2 border-gray px-3 py-2 text-sm" />
        </div>
        <p v-if="editForm.error" class="text-xs text-secondary">{{ editForm.error }}</p>
        <div class="flex gap-2 justify-end">
          <button @click="editForm.visible = false"
            class="rounded-lg border border-gray px-4 py-2 text-sm hover:bg-light transition">
            Annuler
          </button>
          <button @click="submitEdit"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-light hover:bg-primary/90 transition">
            Enregistrer
          </button>
        </div>
      </div>
    </div>

    <!-- Panneau détail établissement -->
    <section v-if="selectedId" class="rounded-2xl border-2 border-gray bg-white shadow-sm">
      <div class="flex items-center justify-between border-b border-gray px-4 py-3">
        <h2 class="font-semibold text-dark">
          {{ etabStore.current?.name ?? `Établissement #${selectedId}` }}
          <span class="ml-2 font-mono text-xs text-dark/50">{{ etabStore.current?.code }}</span>
        </h2>
        <button @click="selectedId = null" class="text-sm text-dark/40 hover:text-dark">✕</button>
      </div>

      <!-- Sous-onglets -->
      <div class="flex gap-1 border-b border-gray px-4 pt-3 overflow-x-auto">
        <button v-for="tab in detailTabs" :key="tab.key"
          @click="activateDetailTab(tab.key)"
          :class="[detailTab === tab.key
            ? 'border-b-2 border-primary text-primary font-semibold'
            : 'text-dark/60 hover:text-dark', 'pb-2 px-2 text-sm transition whitespace-nowrap']">
          {{ tab.label }}
        </button>
      </div>

      <div class="p-4">
        <!-- Stats -->
        <div v-if="detailTab === 'stats'">
          <div v-if="!etabStore.stats" class="text-sm text-dark/60">Chargement...</div>
          <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div class="rounded-xl border border-gray p-3 text-center">
              <p class="text-2xl font-bold text-primary">{{ etabStore.stats.groupCount }}</p>
              <p class="text-xs text-dark/60 mt-1">Groupes</p>
            </div>
            <div class="rounded-xl border border-gray p-3 text-center">
              <p class="text-2xl font-bold text-primary">{{ etabStore.stats.totalMembers }}</p>
              <p class="text-xs text-dark/60 mt-1">Membres</p>
            </div>
            <div class="rounded-xl border border-gray p-3 text-center">
              <p class="text-2xl font-bold text-success">{{ etabStore.stats.activeMembers }}</p>
              <p class="text-xs text-dark/60 mt-1">Actifs</p>
            </div>
            <div class="rounded-xl border border-gray p-3 text-center">
              <p class="text-2xl font-bold text-secondary">{{ etabStore.stats.pendingInvitations }}</p>
              <p class="text-xs text-dark/60 mt-1">Invitations en attente</p>
            </div>
            <div class="rounded-xl border border-gray p-3 text-center">
              <p class="text-2xl font-bold text-dark">{{ etabStore.stats.validatedAccounts }}</p>
              <p class="text-xs text-dark/60 mt-1">Emails vérifiés</p>
            </div>
            <div class="rounded-xl border border-gray p-3 text-center">
              <p class="text-2xl font-bold text-dark">{{ etabStore.stats.roleBreakdown?.students ?? 0 }}</p>
              <p class="text-xs text-dark/60 mt-1">Étudiants</p>
            </div>
            <div class="rounded-xl border border-gray p-3 text-center">
              <p class="text-2xl font-bold text-dark">{{ etabStore.stats.roleBreakdown?.teachers ?? 0 }}</p>
              <p class="text-xs text-dark/60 mt-1">Enseignants</p>
            </div>
            <div class="rounded-xl border border-gray p-3 text-center">
              <p class="text-2xl font-bold text-dark">{{ etabStore.stats.inactiveMembers }}</p>
              <p class="text-xs text-dark/60 mt-1">Inactifs</p>
            </div>
          </div>
          <div v-if="etabStore.stats?.recentActivity?.length" class="mt-4 space-y-2">
            <p class="text-xs font-semibold text-dark/60 uppercase tracking-wide">Activité récente</p>
            <div v-for="log in etabStore.stats.recentActivity" :key="log.id"
              class="rounded-xl border border-gray/50 px-3 py-2 text-xs text-dark/70 flex items-center justify-between">
              <span class="font-mono text-primary">{{ log.action }}</span>
              <span>{{ log.actor?.name ?? '—' }}</span>
              <span class="text-dark/40">{{ formatDate(log.createdAt) }}</span>
            </div>
          </div>
        </div>

        <!-- Journal d'audit -->
        <div v-if="detailTab === 'audit'" class="space-y-3">
          <div class="flex flex-wrap gap-2">
            <input v-model="auditFilters.action" type="text" placeholder="Action (ex: USER_INVITED)"
              class="rounded-lg border border-gray px-3 py-1.5 text-sm" />
            <input v-model="auditFilters.entityType" type="text" placeholder="Type entité"
              class="rounded-lg border border-gray px-3 py-1.5 text-sm" />
            <input v-model="auditFilters.limit" type="number" placeholder="Limite" min="1" max="500"
              class="rounded-lg border border-gray px-3 py-1.5 text-sm w-24" />
            <button @click="reloadAudit"
              class="rounded-lg bg-primary/10 px-3 py-1.5 text-sm text-primary hover:bg-primary/20 transition">
              Filtrer
            </button>
          </div>
          <div v-if="etabStore.audit.length === 0" class="text-sm text-dark/60">Aucune entrée.</div>
          <div v-else class="space-y-1 max-h-96 overflow-y-auto">
            <div v-for="log in etabStore.audit" :key="log.id"
              class="rounded-lg border border-gray/50 px-3 py-2 text-xs flex items-center justify-between gap-2">
              <span class="font-mono text-primary font-semibold min-w-0 truncate">{{ log.action }}</span>
              <span class="text-dark/70">{{ log.entityType }} #{{ log.entityId ?? '—' }}</span>
              <span class="text-dark/50">{{ log.actor?.name ?? '—' }}</span>
              <span class="text-dark/40 shrink-0">{{ formatDate(log.createdAt) }}</span>
            </div>
          </div>
        </div>

        <!-- Gérant -->
        <div v-if="detailTab === 'gerant'" class="space-y-4">
          <div class="rounded-xl border border-gray p-3 text-sm space-y-1">
            <p class="text-xs text-dark/50 uppercase tracking-wide font-semibold">Gérant actuel</p>
            <p v-if="etabStore.current?.admin" class="font-medium text-dark">
              {{ etabStore.current.admin.name }}
              <span class="text-dark/50 font-normal ml-1">{{ etabStore.current.admin.email }}</span>
            </p>
            <p v-else class="text-dark/40 italic">Aucun gérant assigné</p>
          </div>
          <div class="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
            <p class="text-sm font-semibold text-dark">Assigner un gérant par email</p>
            <p class="text-xs text-dark/60">
              L'utilisateur trouvé sera promu en "Admin établissement" et pourra créer et gérer les groupes classes de cet établissement.
            </p>
            <input v-model="gerantForm.email" type="email" placeholder="Email du gérant *"
              class="w-full rounded-lg border-2 border-gray px-3 py-2 text-sm" />
            <p v-if="gerantForm.error" class="text-xs text-secondary">{{ gerantForm.error }}</p>
            <p v-if="gerantForm.success" class="text-xs text-success">{{ gerantForm.success }}</p>
            <div class="flex gap-2">
              <button @click="submitAssignAdmin" :disabled="gerantForm.loading"
                class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-light hover:bg-primary/90 transition disabled:opacity-50">
                {{ gerantForm.loading ? 'En cours...' : 'Assigner' }}
              </button>
              <button @click="gerantForm.email = ''; gerantForm.error = ''"
                class="rounded-lg border border-gray px-4 py-2 text-sm hover:bg-light transition">
                Réinitialiser
              </button>
            </div>
          </div>
        </div>

        <!-- Modération contenu -->
        <div v-if="detailTab === 'content'" class="space-y-4">
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
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useEtablissementStore } from '@/stores/etablissement'

const etabStore = useEtablissementStore()

const selectedId = ref(null)
const detailTab = ref('stats')
const showCreate = ref(false)

const detailTabs = [
  { key: 'stats', label: 'Statistiques' },
  { key: 'audit', label: 'Journal d\'audit' },
  { key: 'content', label: 'Modération contenu' },
  { key: 'gerant', label: 'Gérant' },
]

const createForm = reactive({ name: '', code: '', error: '' })
const editForm = reactive({ visible: false, id: null, name: '', code: '', error: '' })
const auditFilters = reactive({ action: '', entityType: '', limit: '' })
const gerantForm = reactive({ email: '', loading: false, error: '', success: '' })

onMounted(() => etabStore.fetchAll())

async function selectEtab(id) {
  selectedId.value = id
  detailTab.value = 'stats'
  etabStore.stats = null
  etabStore.audit = []
  etabStore.content = null
  await Promise.all([
    etabStore.fetchOne(id),
    etabStore.fetchStats(id),
  ])
}

async function activateDetailTab(key) {
  detailTab.value = key
  if (!selectedId.value) return
  if (key === 'audit' && !etabStore.audit.length) await etabStore.fetchAudit(selectedId.value)
  if (key === 'content' && !etabStore.content) await etabStore.fetchContent(selectedId.value)
}

async function reloadAudit() {
  await etabStore.fetchAudit(selectedId.value, {
    action: auditFilters.action || undefined,
    entityType: auditFilters.entityType || undefined,
    limit: auditFilters.limit || undefined,
  })
}

async function submitCreate() {
  createForm.error = ''
  if (!createForm.name.trim()) { createForm.error = 'Le nom est requis.'; return }
  if (!createForm.code.trim()) { createForm.error = 'Le code est requis.'; return }
  const created = await etabStore.createEtab({
    name: createForm.name.trim(),
    code: createForm.code.trim().toUpperCase(),
  })
  if (created) {
    showCreate.value = false
    Object.assign(createForm, { name: '', code: '', error: '' })
  }
}

function openEdit(etab) {
  Object.assign(editForm, { visible: true, id: etab.id, name: etab.name, code: etab.code, error: '' })
}

async function submitEdit() {
  editForm.error = ''
  const ok = await etabStore.updateEtab(editForm.id, {
    name: editForm.name || undefined,
    code: editForm.code || undefined,
  })
  if (ok) editForm.visible = false
  else editForm.error = "Erreur lors de la mise à jour."
}

async function submitAssignAdmin() {
  gerantForm.error = ''
  gerantForm.success = ''
  if (!gerantForm.email.trim()) { gerantForm.error = "L'email est requis."; return }
  gerantForm.loading = true
  const result = await etabStore.assignAdmin(selectedId.value, gerantForm.email.trim())
  gerantForm.loading = false
  if (result) {
    gerantForm.email = ''
    if (!result.directlyAssigned) {
      gerantForm.success = `Aucun compte trouvé — un email d'invitation a été envoyé à ${result.email}.`
    }
  } else {
    gerantForm.error = "Erreur lors de l'assignation. Vérifiez l'email et réessayez."
  }
}

async function confirmDelete(etab) {
  if (!confirm(`Supprimer "${etab.name}" ? Cette action est irréversible.`)) return
  await etabStore.deleteEtab(etab.id)
  if (selectedId.value === etab.id) selectedId.value = null
}

async function confirmDeleteContent(type, id, title) {
  if (!confirm(`Supprimer "${title}" ? Cette action est irréversible.`)) return
  await etabStore.deleteContent(selectedId.value, type, id)
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>
