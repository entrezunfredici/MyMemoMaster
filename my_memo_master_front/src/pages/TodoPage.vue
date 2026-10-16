<template>
  <div class="todo-page">
    <header class="todo-header">
      <h1 class="todo-title">To-do</h1>
      <span class="todo-date-label">{{ todayLabel }}</span>
    </header>

    <div class="todo-body">
      <TodoWidget />
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import TodoWidget from '@/components/TodoWidget.vue'
import { useRevisionSessionStore } from '@/stores/revisionSessions'
import { useDeadlineStore } from '@/stores/deadlines'

const revisionStore = useRevisionSessionStore()
const deadlineStore = useDeadlineStore()

const todayLabel = new Date().toLocaleDateString('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long'
})

onMounted(async () => {
  await Promise.all([revisionStore.fetchSessions(), deadlineStore.fetchDeadlines()])
})
</script>

<style scoped>
.todo-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--surface-muted);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.todo-header {
  padding: 20px 20px 14px;
  background: rgb(var(--white));
  border-bottom: 0.5px solid var(--slate-200);
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.todo-title {
  font-size: 22px;
  font-weight: 600;
  color: rgb(var(--accent));
  margin: 0;
}

.todo-date-label {
  font-size: 13px;
  color: var(--slate-500);
  text-transform: capitalize;
}

.todo-body {
  flex: 1;
  overflow: hidden;
  background: rgb(var(--white));
  display: flex;
  flex-direction: column;
}
</style>
