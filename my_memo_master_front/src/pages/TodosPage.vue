<script setup>
import { ref, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { useTodosStore } from '@/stores/todos'
import { storeToRefs } from 'pinia'
import { formatDeadline, isOverdue } from '@/helpers/todoHelpers'

const toast = useToast()
const todosStore = useTodosStore()
const { filteredTodos, loading, period, statusFilters, sortOrder, searchQuery } = storeToRefs(todosStore)

// ─── Modal state ──────────────────────────────────────────────────────────────
const showModal = ref(false)
const editingTodo = ref(null)
const form = ref({ title: '', description: '', deadline: '', status: 'pending' })

// ─── Constants ────────────────────────────────────────────────────────────────
const PERIODS = [
  { key: 'day', label: 'Jour' },
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
]

const STATUSES = [
  { key: 'pending', label: 'En attente' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'done', label: 'Terminées' },
]

// ─── Modal helpers ────────────────────────────────────────────────────────────
const openCreate = () => {
  editingTodo.value = null
  form.value = { title: '', description: '', deadline: '', status: 'pending' }
  showModal.value = true
}

const openEdit = (todo) => {
  editingTodo.value = todo
  form.value = {
    title: todo.title,
    description: todo.description || '',
    deadline: todo.deadline ? todo.deadline.slice(0, 10) : '',
    status: todo.status,
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingTodo.value = null
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────
const submitForm = () => {
  if (!form.value.title.trim()) {
    toast.error('Le titre est obligatoire')
    return
  }
  const payload = {
    title: form.value.title.trim(),
    description: form.value.description.trim(),
    deadline: form.value.deadline || null,
    status: form.value.status,
  }
  if (editingTodo.value) {
    const ok = todosStore.updateTodo(editingTodo.value.id, payload)
    ok ? toast.success('Tâche mise à jour') : toast.error('Erreur lors de la mise à jour')
  } else {
    const ok = todosStore.createTodo(payload)
    ok ? toast.success('Tâche créée') : toast.error('Erreur lors de la création')
  }
  closeModal()
}

const deleteTodo = (todo) => {
  if (!confirm(`Supprimer la tâche "${todo.title}" ?`)) return
  const ok = todosStore.deleteTodo(todo.id)
  ok ? toast.success('Tâche supprimée') : toast.error('Erreur lors de la suppression')
}

const toggleDone = (todo) => {
  const newStatus = todo.status === 'done' ? 'pending' : 'done'
  const ok = todosStore.updateTodo(todo.id, { ...todo, status: newStatus })
  if (ok) toast.success(newStatus === 'done' ? 'Tâche terminée !' : 'Tâche réouverte')
}

// ─── Filters & sort ───────────────────────────────────────────────────────────
const toggleSort = () => {
  todosStore.setSortOrder(sortOrder.value === 'asc' ? 'desc' : 'asc')
}

let searchTimeout = null
const onSearchInput = (e) => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    todosStore.setSearchQuery(e.target.value)
    todosStore.fetchTodos()
  }, 300)
}

onMounted(() => {
  todosStore.fetchTodos()
})
</script>

<template>
  <div class="todos-page">

    <!-- ── Controls bar ──────────────────────────────────────────────────── -->
    <div class="todos-page__controls">

      <!-- Period tabs -->
      <div class="todos-page__periods" role="tablist" aria-label="Période">
        <button
          v-for="p in PERIODS"
          :key="p.key"
          role="tab"
          :aria-selected="period === p.key"
          :class="['period-tab', { 'period-tab--active': period === p.key }]"
          @click="todosStore.setPeriod(p.key)"
        >
          {{ p.label }}
        </button>
      </div>

      <!-- Status filter pills -->
      <div class="todos-page__filters" role="group" aria-label="Filtrer par état">
        <button
          v-for="s in STATUSES"
          :key="s.key"
          :class="['filter-pill', `filter-pill--${s.key}`, { 'filter-pill--active': statusFilters.includes(s.key) }]"
          :aria-pressed="statusFilters.includes(s.key)"
          @click="todosStore.toggleStatusFilter(s.key)"
        >
          {{ s.label }}
        </button>
      </div>

      <!-- Search + sort + create -->
      <div class="todos-page__actions">
        <input
          type="search"
          placeholder="Rechercher une tâche…"
          :value="searchQuery"
          @input="onSearchInput"
          class="search-input"
          aria-label="Rechercher une tâche"
        />
        <button
          class="sort-btn"
          @click="toggleSort"
          :title="`Trier par deadline ${sortOrder === 'asc' ? 'croissante' : 'décroissante'}`"
          :aria-label="`Trier par deadline ${sortOrder === 'asc' ? 'croissante' : 'décroissante'}`"
        >
          Deadline {{ sortOrder === 'asc' ? '↑' : '↓' }}
        </button>
        <button class="create-btn" @click="openCreate" aria-label="Créer une tâche">
          + Créer une tâche
        </button>
      </div>
    </div>

    <!-- ── Skeleton loading ──────────────────────────────────────────────── -->
    <div v-if="loading" class="todos-page__grid" aria-busy="true" aria-label="Chargement…">
      <div v-for="i in 6" :key="i" class="todo-skeleton" aria-hidden="true">
        <div class="skeleton-line skeleton-line--title"></div>
        <div class="skeleton-line skeleton-line--desc"></div>
        <div class="skeleton-line skeleton-line--meta"></div>
      </div>
    </div>

    <!-- ── Empty state ───────────────────────────────────────────────────── -->
    <div v-else-if="filteredTodos.length === 0" class="todos-page__empty">
      <div class="empty-icon" aria-hidden="true">📋</div>
      <p class="empty-title">Aucune tâche trouvée</p>
      <p class="empty-subtitle">Commencez par créer votre première tâche.</p>
      <button class="create-btn" @click="openCreate">+ Créer une tâche</button>
    </div>

    <!-- ── Todos grid ────────────────────────────────────────────────────── -->
    <div v-else class="todos-page__grid">
      <article
        v-for="todo in filteredTodos"
        :key="todo.id"
        :class="['todo-card', { 'todo-card--done': todo.status === 'done' }]"
      >
        <!-- Header: checkbox + title + status badge -->
        <div class="todo-card__header">
          <label class="todo-card__check-label">
            <input
              type="checkbox"
              :checked="todo.status === 'done'"
              @change="toggleDone(todo)"
              class="todo-card__checkbox"
              :aria-label="`Marquer &quot;${todo.title}&quot; comme ${todo.status === 'done' ? 'non terminée' : 'terminée'}`"
            />
            <span class="todo-card__title">{{ todo.title }}</span>
          </label>
          <span :class="['status-badge', `status-badge--${todo.status}`]">
            {{ STATUSES.find((s) => s.key === todo.status)?.label ?? todo.status }}
          </span>
        </div>

        <!-- Description -->
        <p v-if="todo.description" class="todo-card__desc">{{ todo.description }}</p>

        <!-- Footer: deadline + actions -->
        <div class="todo-card__footer">
          <span
            v-if="todo.deadline"
            :class="['deadline', { 'deadline--overdue': isOverdue(todo.deadline) && todo.status !== 'done' }]"
          >
            📅 {{ formatDeadline(todo.deadline) }}
            <span v-if="isOverdue(todo.deadline) && todo.status !== 'done'" class="overdue-tag">En retard</span>
          </span>
          <span v-else class="deadline deadline--none">Sans deadline</span>

          <div class="todo-card__actions">
            <button class="btn-icon btn-edit" @click="openEdit(todo)" aria-label="Modifier la tâche" title="Modifier">
              ✏️
            </button>
            <button class="btn-icon btn-delete" @click="deleteTodo(todo)" aria-label="Supprimer la tâche" title="Supprimer">
              🗑️
            </button>
          </div>
        </div>
      </article>
    </div>

    <!-- ── Create / Edit modal ───────────────────────────────────────────── -->
    <div
      v-if="showModal"
      class="modal"
      role="dialog"
      :aria-label="editingTodo ? 'Modifier la tâche' : 'Créer une tâche'"
      aria-modal="true"
      @keydown.esc="closeModal"
    >
      <div class="modal__overlay" @click.self="closeModal"></div>
      <div class="modal__dialog">
        <h2 class="modal__title">{{ editingTodo ? 'Modifier la tâche' : 'Nouvelle tâche' }}</h2>

        <form @submit.prevent="submitForm" class="modal__form" novalidate>
          <div class="form-group">
            <label for="todo-title" class="form-label">Titre <span class="required" aria-hidden="true">*</span></label>
            <input
              id="todo-title"
              v-model="form.title"
              type="text"
              class="form-input"
              placeholder="Titre de la tâche"
              required
              autofocus
              aria-required="true"
            />
          </div>

          <div class="form-group">
            <label for="todo-desc" class="form-label">Description</label>
            <textarea
              id="todo-desc"
              v-model="form.description"
              class="form-input form-textarea"
              placeholder="Description optionnelle…"
              rows="3"
            ></textarea>
          </div>

          <div class="form-group">
            <label for="todo-deadline" class="form-label">Deadline</label>
            <input
              id="todo-deadline"
              v-model="form.deadline"
              type="date"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="todo-status" class="form-label">État</label>
            <select id="todo-status" v-model="form.status" class="form-input">
              <option v-for="s in STATUSES" :key="s.key" :value="s.key">{{ s.label }}</option>
            </select>
          </div>

          <div class="modal__actions">
            <button type="button" class="btn-cancel" @click="closeModal">Annuler</button>
            <button type="submit" class="btn-submit">
              {{ editingTodo ? 'Mettre à jour' : 'Créer' }}
            </button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* ── Page wrapper ──────────────────────────────────────────────────────────── */
.todos-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Controls bar ──────────────────────────────────────────────────────────── */
.todos-page__controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #ffffff;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
}

/* Period tabs */
.todos-page__periods {
  display: flex;
  gap: 8px;
}

.period-tab {
  flex: 1;
  padding: 8px 16px;
  border-radius: 12px;
  border: 2px solid #e5e7eb;
  background: transparent;
  font-weight: 600;
  font-size: 14px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.period-tab:hover {
  border-color: #1E3BA1;
  color: #1E3BA1;
}

.period-tab--active {
  background: #1E3BA1;
  border-color: #1E3BA1;
  color: #ffffff;
}

/* Status filter pills */
.todos-page__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-pill {
  padding: 6px 14px;
  border-radius: 20px;
  border: 2px solid transparent;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: 0.5;
}

.filter-pill--active {
  opacity: 1;
}

.filter-pill--pending {
  background: #e0f2fe;
  color: #0369a1;
  border-color: #bae6fd;
}

.filter-pill--pending.filter-pill--active {
  background: #0369a1;
  color: #ffffff;
  border-color: #0369a1;
}

.filter-pill--in_progress {
  background: #fef3c7;
  color: #92400e;
  border-color: #fde68a;
}

.filter-pill--in_progress.filter-pill--active {
  background: #d97706;
  color: #ffffff;
  border-color: #d97706;
}

.filter-pill--done {
  background: #d1fae5;
  color: #065f46;
  border-color: #a7f3d0;
}

.filter-pill--done.filter-pill--active {
  background: #059669;
  color: #ffffff;
  border-color: #059669;
}

/* Search + sort + create */
.todos-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.search-input {
  flex: 1;
  min-width: 160px;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1.5px solid #e5e7eb;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #1E3BA1;
}

.sort-btn {
  padding: 8px 14px;
  border-radius: 12px;
  border: 1.5px solid #e5e7eb;
  background: #f8fafc;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: #374151;
  transition: all 0.2s;
  white-space: nowrap;
}

.sort-btn:hover {
  border-color: #1E3BA1;
  color: #1E3BA1;
}

.create-btn {
  padding: 8px 18px;
  border-radius: 12px;
  border: none;
  background: #1E3BA1;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
  white-space: nowrap;
}

.create-btn:hover {
  background: #162d82;
  transform: translateY(-1px);
}

.create-btn:active {
  transform: translateY(0);
}

/* ── Grid ──────────────────────────────────────────────────────────────────── */
.todos-page__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (max-width: 640px) {
  .todos-page__grid {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 1280px) {
  .todos-page__grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* ── Todo card ─────────────────────────────────────────────────────────────── */
.todo-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.07);
  border: 1.5px solid transparent;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
}

.todo-card:hover {
  border-color: #1E3BA1;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(30, 59, 161, 0.12);
}

.todo-card--done {
  opacity: 0.65;
}

.todo-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.todo-card__check-label {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
  flex: 1;
}

.todo-card__checkbox {
  margin-top: 2px;
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #1E3BA1;
  flex-shrink: 0;
}

.todo-card__title {
  font-weight: 700;
  font-size: 15px;
  color: #1f2937;
  line-height: 1.4;
  word-break: break-word;
}

.todo-card--done .todo-card__title {
  text-decoration: line-through;
  color: #9ca3af;
}

/* Status badge */
.status-badge {
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}

.status-badge--pending {
  background: #e0f2fe;
  color: #0369a1;
}

.status-badge--in_progress {
  background: #fef3c7;
  color: #92400e;
}

.status-badge--done {
  background: #d1fae5;
  color: #065f46;
}

/* Description */
.todo-card__desc {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Footer */
.todo-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: auto;
}

.deadline {
  font-size: 12px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.deadline--overdue {
  color: #dc2626;
}

.deadline--none {
  font-style: italic;
  color: #9ca3af;
}

.overdue-tag {
  background: #fee2e2;
  color: #dc2626;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 8px;
}

.todo-card__actions {
  display: flex;
  gap: 4px;
  margin-left: auto;
}

.btn-icon {
  padding: 5px 8px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  background: transparent;
  transition: background 0.15s;
}

.btn-edit:hover {
  background: #e0f2fe;
}

.btn-delete:hover {
  background: #fee2e2;
}

/* ── Skeleton loading ──────────────────────────────────────────────────────── */
.todo-skeleton {
  background: #ffffff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.07);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-line {
  border-radius: 8px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.4s infinite;
}

.skeleton-line--title {
  height: 18px;
  width: 65%;
}

.skeleton-line--desc {
  height: 14px;
  width: 90%;
}

.skeleton-line--meta {
  height: 12px;
  width: 40%;
}

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Empty state ───────────────────────────────────────────────────────────── */
.todos-page__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 20px;
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  line-height: 1;
}

.empty-title {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.empty-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

/* ── Modal ─────────────────────────────────────────────────────────────────── */
.modal {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 100;
}

.modal__overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
}

.modal__dialog {
  position: relative;
  background: #ffffff;
  border-radius: 20px;
  padding: 28px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.2);
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal__title {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.modal__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.required {
  color: #dc2626;
}

.form-input {
  padding: 10px 12px;
  border-radius: 12px;
  border: 1.5px solid #e5e7eb;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  font-family: inherit;
}

.form-input:focus {
  border-color: #1E3BA1;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
}

.btn-cancel {
  padding: 9px 18px;
  border-radius: 12px;
  border: 1.5px solid #e5e7eb;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}

.btn-cancel:hover {
  border-color: #9ca3af;
  color: #374151;
}

.btn-submit {
  padding: 9px 22px;
  border-radius: 12px;
  border: none;
  background: #1E3BA1;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-submit:hover {
  background: #162d82;
}
</style>
