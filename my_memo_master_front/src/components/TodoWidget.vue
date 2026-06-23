<template>
  <div class="todo-widget">
    <!-- Onglets de filtre -->
    <div class="todo-tabs">
      <button
        v-for="tab in TABS"
        :key="tab.id"
        class="todo-tab"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
        <span v-if="tabCount(tab.id) > 0" class="todo-tab-count">{{ tabCount(tab.id) }}</span>
      </button>
    </div>

    <!-- Liste -->
    <div class="todo-list">
      <p v-if="filteredItems.length === 0" class="todo-empty">Aucun élément</p>

      <div
        v-for="item in filteredItems"
        :key="item._key"
        class="todo-item"
        :class="[`todo-item--${item._type}`, { 'todo-item--done': item.isDone }]"
      >
        <!-- Checkbox (séances uniquement) -->
        <label v-if="item._type === 'session'" class="todo-check-wrap" :title="item.isDone ? 'Marquer non terminé' : 'Marquer terminé'">
          <input
            type="checkbox"
            class="todo-check"
            :checked="item.isDone"
            @change="toggle(item)"
          />
          <span class="todo-check-box" />
        </label>
        <span v-else class="todo-check-spacer" />

        <!-- Contenu -->
        <div class="todo-content">
          <span class="todo-name">{{ item.name }}</span>
          <span class="todo-sub">
            <span v-if="item._type === 'session' && item.startTime">
              {{ item.startTime.slice(0, 5) }}
            </span>
            <span v-if="item._date !== todayStr" class="todo-date">
              {{ formatDate(item._date) }}
            </span>
          </span>
        </div>

        <!-- Badge type -->
        <span class="todo-badge" :class="`todo-badge--${item._type}`">
          {{ item._type === 'session' ? 'Révision' : 'Échéance' }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRevisionSessionStore } from '@/stores/revisionSessions'
import { useDeadlineStore } from '@/stores/deadlines'

const revisionStore = useRevisionSessionStore()
const deadlineStore = useDeadlineStore()

function getLocalToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const todayStr = ref(getLocalToday())

const TABS = [
  { id: 'todo', label: 'À faire' },
  { id: 'today', label: "Aujourd'hui" },
  { id: 'upcoming', label: 'À venir' },
  { id: 'done', label: 'Terminé' }
]

const activeTab = ref('todo')

/* ── Normalisation des items ── */
const allSessions = computed(() =>
  revisionStore.sessions.map((s) => ({
    ...s,
    _type: 'session',
    _key: `session-${s.id}`,
    _date: s.date,
    _time: s.startTime || ''
  }))
)

const allDeadlines = computed(() =>
  deadlineStore.deadlines.map((d) => ({
    ...d,
    _type: 'deadline',
    _key: `deadline-${d.id}`,
    _date: d.dueDate,
    _time: d.dueTime || '23:59'
  }))
)

function sortByDateTime(items) {
  return [...items].sort((a, b) => {
    const d = a._date.localeCompare(b._date)
    return d !== 0 ? d : a._time.localeCompare(b._time)
  })
}

/* ── Filtres par onglet ── */
const filteredItems = computed(() => {
  if (activeTab.value === 'today') {
    const sessions = allSessions.value.filter((s) => s._date === todayStr.value)
    const deadlines = allDeadlines.value.filter((d) => d._date === todayStr.value)
    return sortByDateTime([...sessions, ...deadlines])
  }

  if (activeTab.value === 'upcoming') {
    const sessions = allSessions.value.filter((s) => s._date > todayStr.value && !s.isDone)
    const deadlines = allDeadlines.value.filter((d) => d._date > todayStr.value)
    return sortByDateTime([...sessions, ...deadlines])
  }

  if (activeTab.value === 'done') {
    return sortByDateTime(allSessions.value.filter((s) => s.isDone))
  }

  // 'todo' : séances non terminées (toutes dates) + deadlines du jour ou à venir
  const sessions = allSessions.value.filter((s) => !s.isDone)
  const deadlines = allDeadlines.value.filter((d) => d._date >= todayStr.value)
  return sortByDateTime([...sessions, ...deadlines])
})

/* ── Compteurs pour les badges d'onglet ── */
function tabCount(tabId) {
  if (tabId === 'today') {
    return (
      allSessions.value.filter((s) => s._date === todayStr.value).length +
      allDeadlines.value.filter((d) => d._date === todayStr.value).length
    )
  }
  if (tabId === 'upcoming') {
    return (
      allSessions.value.filter((s) => s._date > todayStr.value && !s.isDone).length +
      allDeadlines.value.filter((d) => d._date > todayStr.value).length
    )
  }
  if (tabId === 'done') {
    return allSessions.value.filter((s) => s.isDone).length
  }
  // 'todo'
  return (
    allSessions.value.filter((s) => !s.isDone).length +
    allDeadlines.value.filter((d) => d._date >= todayStr.value).length
  )
}

/* ── Actions ── */
async function toggle(item) {
  await revisionStore.markDone(item.id, !item.isDone)
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
</script>

<style scoped>
.todo-widget {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

/* ── Onglets ── */
.todo-tabs {
  display: flex;
  border-bottom: 0.5px solid #e2e8f0;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.todo-tab {
  flex: 1;
  padding: 8px 4px;
  font-size: 10px;
  font-weight: 600;
  color: #94a3b8;
  background: none;
  border: none;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: color 0.15s;
  border-bottom: 2px solid transparent;
}

.todo-tab.active {
  color: #1a1aff;
  border-bottom-color: #1a1aff;
}

.todo-tab-count {
  background: #1a1aff;
  color: #fff;
  border-radius: 99px;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  line-height: 1.4;
}

/* ── Liste ── */
.todo-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.todo-empty {
  font-size: 12px;
  color: #cbd5e1;
  text-align: center;
  margin: 20px 0;
}

/* ── Item ── */
.todo-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  border-bottom: 0.5px solid #f8fafc;
  transition: background 0.1s;
}

.todo-item:hover {
  background: #f8fafc;
}

.todo-item--done .todo-name {
  text-decoration: line-through;
  color: #94a3b8;
}

/* ── Checkbox ── */
.todo-check-wrap {
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.todo-check {
  display: none;
}

.todo-check-box {
  width: 16px;
  height: 16px;
  border: 1.5px solid #cbd5e1;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, border-color 0.15s;
  flex-shrink: 0;
}

.todo-check:checked + .todo-check-box {
  background: #16a34a;
  border-color: #16a34a;
}

.todo-check:checked + .todo-check-box::after {
  content: '';
  display: block;
  width: 5px;
  height: 9px;
  border: 2px solid #fff;
  border-top: none;
  border-left: none;
  transform: rotate(45deg) translate(-1px, -1px);
}

.todo-check-spacer {
  width: 16px;
  flex-shrink: 0;
}

/* ── Contenu ── */
.todo-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.todo-name {
  font-size: 12px;
  font-weight: 500;
  color: #0f172a;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.todo-sub {
  font-size: 10px;
  color: #94a3b8;
  display: flex;
  gap: 6px;
}

.todo-date {
  color: #94a3b8;
}

/* ── Badge type ── */
.todo-badge {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  padding: 2px 6px;
  border-radius: 99px;
  flex-shrink: 0;
}

.todo-badge--session {
  background: rgba(22, 163, 74, 0.1);
  color: #16a34a;
}

.todo-badge--deadline {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}
</style>
