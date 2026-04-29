<template>
  <div class="mindmaps-page">
    <header class="mindmaps-page__header">
      <h1>Mind Maps</h1>
    </header>
    <div class="mindmaps-page__layout">
      <aside class="mindmaps-page__sidebar">
        <div class="sidebar__tools">
          <div class="sidebar__modes">
            <button @click="toggleEditMode" :class="{ active: editMode }">Editer</button>
            <button @click="toggleDeleteMode" :class="{ active: deleteMode }">Supprimer</button>
          </div>
          <input v-model="searchQuery" placeholder="Rechercher..." />
          <select v-model="selectedUser">
            <option value="">Tous les utilisateurs</option>
            <option v-for="user in users" :key="user" :value="user">Utilisateur {{ user }}</option>
          </select>
          <select v-model="selectedSubject">
            <option value="">Toutes les matieres</option>
            <option v-for="subject in subjects" :key="subject" :value="subject">Matiere {{ subject }}</option>
          </select>
        </div>
        <ul class="sidebar__list">
          <li
            v-for="diagram in filteredDiagrams"
            :key="diagram.idMindMap"
            :class="['sidebar__item', { active: diagram.idMindMap === currentDiagramId }]"
          >
            <div class="sidebar__item-main" @click="loadDiagram(diagram)">
              <span class="sidebar__item-title">{{ diagram.mmName }}</span>
              <small class="sidebar__item-meta">Utilisateur {{ diagram.userId }} - Matiere {{ diagram.subjectId }}</small>
            </div>
            <div class="sidebar__item-actions">
              <button v-if="editMode" @click.stop="openEditModal(diagram)">Renommer</button>
              <button v-if="deleteMode" class="danger" @click.stop="confirmDelete(diagram)">Supprimer</button>
            </div>
          </li>
        </ul>
      </aside>

      <main class="mindmaps-page__content">
        <MindMapBuilder
          ref="builderRef"
          :map-payload="currentMapPayload"
          :loading="isSaving || isExporting"
          @save="handleSave"
          @export="handleExport"
          @new-map="handleNewMap"
        />
      </main>
    </div>

    <div v-if="showEditModal" class="modal">
      <div class="modal__dialog">
        <h2>Modifier le nom</h2>
        <input v-model="editedName" />
        <div class="modal__actions">
          <button @click="showEditModal = false">Annuler</button>
          <button class="primary" @click="confirmEdit">Valider</button>
        </div>
      </div>
    </div>

    <div v-if="showExportModal" class="modal">
      <div class="modal__dialog">
        <h2>Nom de la carte mentale</h2>
        <input v-model="exportName" />
        <div class="modal__actions">
          <button @click="showExportModal = false">Annuler</button>
          <button class="primary" @click="confirmExportModal" :disabled="isExporting">Valider</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped src="./mindMaps.css"></style>
<script src="./mindMaps.js"></script>
