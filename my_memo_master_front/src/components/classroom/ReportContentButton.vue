<template>
  <span v-if="canReport">
    <button
      type="button"
      class="text-xs text-gray-600 underline hover:text-dark"
      :aria-label="`Signaler « ${contentTitle} »`"
      @click="open"
    >
      Signaler
    </button>

    <ModalComponent :visible="visible" title="Signaler ce contenu" @close="close">
      <form :id="`${uid}-form`" novalidate @submit.prevent="submit">
        <p class="mb-4 text-sm text-gray-700">
          Contenu signalé : <strong>{{ contentTitle }}</strong>. Votre signalement est confidentiel : l'auteur n'en
          connaîtra pas l'origine.
        </p>

        <fieldset class="form-group">
          <legend class="form-label">Motif du signalement</legend>
          <div v-for="r in REPORT_REASONS" :key="r.value" class="mb-2 flex items-start gap-2">
            <input :id="`${uid}-${r.value}`" v-model="reason" type="radio" name="reason" :value="r.value" class="mt-1" />
            <label :for="`${uid}-${r.value}`" class="text-sm text-dark">
              {{ r.label }}
              <span class="block text-xs text-gray-600">{{ r.hint }}</span>
            </label>
          </div>
        </fieldset>

        <div class="form-group">
          <label class="form-label" :for="`${uid}-comment`">
            Commentaire {{ commentRequired ? '(obligatoire)' : '(facultatif)' }}
          </label>
          <textarea
            :id="`${uid}-comment`"
            v-model="comment"
            class="form-input"
            rows="3"
            :maxlength="REPORT_COMMENT_MAX"
            :required="commentRequired"
            :aria-invalid="error ? 'true' : undefined"
            :aria-describedby="error ? `${uid}-error` : undefined"
          />
          <p class="mt-1 text-xs text-gray-600">{{ comment.length }} / {{ REPORT_COMMENT_MAX }}</p>
        </div>

        <p v-if="error" :id="`${uid}-error`" role="alert" class="text-sm text-red-600">{{ error }}</p>
      </form>

      <template #footer>
        <button type="button" class="btn-modal-cancel" @click="close">Annuler</button>
        <button type="submit" :form="`${uid}-form`" class="btn-modal-submit" :disabled="store.submitting">
          Envoyer le signalement
        </button>
      </template>
    </ModalComponent>
  </span>
</template>

<script setup>
// Bouton « Signaler » d'un contenu partagé dans un groupe classe (ressource, section ou rendu) et son formulaire.
// Masqué sur le contenu de l'utilisateur connecté : l'API refuse de toute façon l'auto-signalement.
import { computed, ref, useId } from 'vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useAuthStore } from '@/stores/auth'
import { useContentReportStore } from '@/stores/contentReports'
import { REPORT_REASONS, REPORT_COMMENT_MAX, isCommentRequired, validateReport } from '@/helpers/moderation'

const props = defineProps({
  contentType: { type: String, required: true, validator: (v) => ['resource', 'section'].includes(v) },
  contentId: { type: Number, required: true },
  contentTitle: { type: String, required: true },
  // Auteur du contenu (createdBy) : le bouton n'apparaît pas pour lui.
  authorId: { type: Number, default: null },
})

const auth = useAuthStore()
const store = useContentReportStore()
const uid = useId()

const visible = ref(false)
const reason = ref('')
const comment = ref('')
const error = ref('')

const commentRequired = computed(() => isCommentRequired(reason.value))
const canReport = computed(() => !!auth.user?.userId && props.authorId !== auth.user.userId)

function open() {
  reason.value = ''
  comment.value = ''
  error.value = ''
  visible.value = true
}

function close() {
  visible.value = false
}

async function submit() {
  error.value = validateReport({ reason: reason.value, comment: comment.value })
  if (error.value) return
  const ok = await store.submit({
    contentType: props.contentType,
    contentId: props.contentId,
    reason: reason.value,
    comment: comment.value,
  })
  if (ok) close()
}
</script>
