<template>
  <div class="moderation-page container mx-auto space-y-6 px-4 py-4">
    <p class="text-sm text-dark/70">
      Contenus signalés des groupes classes. Choisissez un dossier pour le masquer 30 jours (réversible), le supprimer
      définitivement, le rejeter, ou suspendre le compte de son auteur.
    </p>

    <ModerationQueue ref="queue" @select="selectedId = $event" />
    <ModerationReportDetail :report-id="selectedId" @close="selectedId = null" @changed="queue?.reload()" />
  </div>
</template>

<script setup>
// Interface modérateur (rôles 1, 4 et 5 — garde du routeur) : file de traitement des signalements et examen d'un dossier.
import { ref } from 'vue'
import ModerationQueue from '@/components/moderation/ModerationQueue.vue'
import ModerationReportDetail from '@/components/moderation/ModerationReportDetail.vue'

const queue = ref(null)
const selectedId = ref(null)
</script>
