import { ref, reactive, watch, onBeforeUnmount } from 'vue'
import { flashcardsApi } from '@/helpers/flashcards/flashcardsApi'
import { notif } from '@/helpers/notif'
import { normalizeFormulaSyntax } from '@/components/interpreter/interpreter.js'
import { useGuidedTourStore } from '@/stores/guidedTour'

const emptyMcqOptions = () => [{ text: '', correct: true }, { text: '', correct: false }]

/**
 * Formulaire d'ajout / modification d'une carte de Leitner (ouverte ou QCM) : saisie, aperçu en
 * direct de la qualité de la réponse, enregistrement (question → réponses → carte).
 *
 * @param {object} options
 * @param {number} options.systemId - système auquel la carte est ajoutée
 * @param {() => object|null} options.getMindMapJson - carte mentale liée au système (lien au nœud)
 * @param {() => Promise<void>} options.reload - recharge les cartes de la page après un enregistrement
 */
export function useCardForm({ systemId, getMindMapJson, reload }) {
  const guidedTourStore = useGuidedTourStore()

  const showModal = ref(false)
  const submitting = ref(false)
  const formError = ref('')
  const editingCard = ref(null)
  const form = reactive({
    statement: '',
    answer: '',
    altAnswers: [],
    type: 'open',
    mcqOptions: emptyMcqOptions(),
    mindMapNodeId: null,
  })

  // Résultat de AnswerQuality.service.js (back) affiché dans la fenêtre (DECISIONS.md 2026-09-12) —
  // alimenté de deux façons : en direct pendant la saisie via POST /responses/quality-preview
  // (aucune persistance, `schedulePreview` ci-dessous), puis remplacé par le résultat réel renvoyé
  // par la sauvegarde (POST /responses ou PUT /responses/edit/:id) une fois enregistré. `level: null`
  // = pas encore évalué (champs incomplets, ou carte QCM sans réponse à évaluer).
  const lastQuality = reactive({ level: null, warnings: [] })
  // true seulement quand lastQuality reflète la réponse RÉELLEMENT enregistrée ; false pendant
  // l'aperçu en direct (rien n'est encore sauvegardé) — distingue les deux dans le libellé affiché.
  const qualitySaved = ref(false)
  // true quand la carte vient d'être créée et que la fenêtre reste ouverte pour afficher la qualité :
  // le bouton « Ajouter » est alors remplacé, pour ne pas créer un doublon en recliquant.
  const justCreated = ref(false)

  const resetQuality = () => {
    lastQuality.level = null
    lastQuality.warnings = []
    qualitySaved.value = false
    justCreated.value = false
  }

  // ── Aperçu de qualité en direct ──────────────────────────────────────────────
  // Débounce (500 ms) pour ne pas interroger l'API à chaque frappe ; `previewSeq` ignore la réponse
  // d'un appel devenu obsolète si une saisie plus récente a relancé un appel entre-temps (réponses
  // réseau pouvant arriver dans le désordre).
  let previewTimer = null
  let previewSeq = 0
  function schedulePreview() {
    clearTimeout(previewTimer)

    const statement = form.statement.trim()
    const answer = form.answer.trim()
    if (form.type !== 'open' || !statement || !answer) {
      lastQuality.level = null
      lastQuality.warnings = []
      qualitySaved.value = false
      return
    }

    previewTimer = setTimeout(async () => {
      const mySeq = ++previewSeq
      const acceptedAnswers = form.altAnswers.map((a) => a.trim()).filter(Boolean)
      const resp = await flashcardsApi.previewQuality({ statement, answer, acceptedAnswers })
      if (mySeq !== previewSeq) return
      if (resp && resp.status === 200) {
        lastQuality.level = resp.data.qualityLevel
        lastQuality.warnings = resp.data.qualityWarnings || []
        qualitySaved.value = false
      }
    }, 500)
  }

  watch(() => [form.statement, form.answer, form.type, ...form.altAnswers], schedulePreview)
  onBeforeUnmount(() => clearTimeout(previewTimer))

  // ── Saisie ────────────────────────────────────────────────────────────────────
  const selectType = (newType) => {
    if (form.type === newType) return
    form.type = newType
    form.answer = ''
    form.mcqOptions = emptyMcqOptions()
  }

  const setOptionText = (idx, value) => {
    form.mcqOptions = form.mcqOptions.map((o, i) => (i === idx ? { ...o, text: value } : o))
  }

  const setMcqCorrect = (correctIdx) => {
    form.mcqOptions = form.mcqOptions.map((o, i) => ({ ...o, correct: i === correctIdx }))
  }

  const addMcqOption = () => {
    form.mcqOptions = [...form.mcqOptions, { text: '', correct: false }]
  }

  const removeMcqOption = (idx) => {
    form.mcqOptions = form.mcqOptions.filter((_, i) => i !== idx)
  }

  // Pré-remplit l'énoncé avec le libellé du nœud choisi si l'énoncé est encore vide
  const onNodeSelected = (node) => {
    if (node && !form.statement.trim()) {
      form.statement = node.label || ''
    }
  }

  // ── Ouverture / fermeture ─────────────────────────────────────────────────────
  const resetForm = () => {
    form.statement = ''
    form.answer = ''
    form.altAnswers = []
    form.type = 'open'
    form.mcqOptions = emptyMcqOptions()
    form.mindMapNodeId = null
    formError.value = ''
    resetQuality()
  }

  const openAdd = () => {
    editingCard.value = null
    resetForm()
    showModal.value = true
  }

  const openEdit = (card) => {
    editingCard.value = card
    form.statement = card.question?.statement || ''
    form.answer = card.correctAnswer || ''
    form.type = card.question?.type || 'open'
    form.mindMapNodeId = card.mindMapNodeId || null
    if (form.type === 'mcq' && Array.isArray(card.question?.content?.options)) {
      form.mcqOptions = card.question.content.options.map((o) => ({ text: o.text, correct: !!o.correct }))
    } else {
      form.mcqOptions = emptyMcqOptions()
    }
    formError.value = ''
    resetQuality()
    showModal.value = true
  }

  const close = () => {
    showModal.value = false
    editingCard.value = null
    resetForm()
  }

  // ── Enregistrement ────────────────────────────────────────────────────────────
  const create = async () => {
    if (form.type === 'mcq') {
      if (form.mcqOptions.some((o) => !o.text.trim())) {
        formError.value = 'Toutes les options doivent avoir un texte.'
        return
      }
      if (!form.mcqOptions.some((o) => o.correct)) {
        formError.value = 'Sélectionne la bonne réponse (radio).'
        return
      }
    }

    // 1. Créer la question (contenu selon le type) — syntaxe de formule normalisée
    const qResp = await flashcardsApi.createQuestion({
      statement: normalizeFormulaSyntax(form.statement),
      questionPosition: 0,
      type: form.type,
      content:
        form.type === 'mcq'
          ? { options: form.mcqOptions.map((o) => ({ text: normalizeFormulaSyntax(o.text), correct: o.correct })) }
          : null,
    })
    if (!qResp || qResp.status !== 201) {
      formError.value = qResp?.data?.message || 'Erreur lors de la création de la question.'
      return
    }
    const idQuestion = qResp.data.idQuestion

    // 2. Créer la ou les réponses acceptées (ouvertes uniquement — la correction d'un QCM est dans
    // content). Plusieurs réponses correction=true sont supportées par la correction sémantique
    // (meilleur score retenu) : utile pour accepter la formule ET son énoncé en toutes lettres.
    if (form.type === 'open') {
      const acceptedAnswers = [form.answer, ...form.altAnswers].map((a) => a.trim()).filter(Boolean)
      let mainResponseId = null
      for (const [i, answer] of acceptedAnswers.entries()) {
        const rResp = await flashcardsApi.createResponse({
          content: normalizeFormulaSyntax(answer),
          correction: true,
          idQuestion,
        })
        if (!rResp || rResp.status !== 201) {
          formError.value = rResp?.data?.message || 'Erreur lors de la création de la réponse.'
          return
        }
        if (i === 0) mainResponseId = rResp.data.idResponse
      }
      // AnswerQuality.service.js (back) tient compte des reformulations déjà en base au moment de
      // CHAQUE création ci-dessus — la réponse principale (1ʳᵉ créée) ne voyait donc encore AUCUNE
      // des formulations suivantes à cet instant. On la ré-enregistre à l'identique juste après
      // (PUT, contenu inchangé) uniquement pour redéclencher le calcul de qualité une fois toutes
      // les formulations réellement en base — DECISIONS.md 2026-09-12.
      if (mainResponseId) {
        const qualityResp = await flashcardsApi.updateResponse(mainResponseId, {
          content: normalizeFormulaSyntax(acceptedAnswers[0]),
        })
        if (qualityResp && qualityResp.status === 200) {
          lastQuality.level = qualityResp.data.qualityLevel
          lastQuality.warnings = qualityResp.data.qualityWarnings || []
          qualitySaved.value = true
        }
      }
    }

    // 3. Créer la carte (avec le nœud de carte mentale lié le cas échéant)
    const cResp = await flashcardsApi.createCard({
      idQuestion,
      idSystem: systemId,
      mindMapNodeId: form.mindMapNodeId || null,
    })
    if (!cResp || cResp.status !== 201) {
      formError.value = cResp?.data?.message || 'Erreur lors de la création de la carte.'
      return
    }

    // Parcours guidé : une première flashcard valide l'étape « système de Leitner »
    guidedTourStore.recordLinks({ flashcardId: cResp.data?.idCard ?? -1 })

    notif.notify('Carte ajoutée avec succès.', 'success')
    await reload()
    // CHOIX: toujours rester sur l'écran de confirmation après une création, quelle que soit la qualité
    // RAISON: la fenêtre se fermait seulement pour « Bonne qualité », ce qui déroutait à l'ajout en série.
    justCreated.value = true
  }

  const update = async () => {
    const card = editingCard.value
    const isMcq = card.question?.type === 'mcq'

    if (isMcq && form.mcqOptions.some((o) => !o.text.trim())) {
      formError.value = 'Toutes les options doivent avoir un texte.'
      return
    }

    const qPayload = { statement: normalizeFormulaSyntax(form.statement) }
    if (isMcq) {
      qPayload.content = { options: form.mcqOptions.map((o) => ({ text: normalizeFormulaSyntax(o.text), correct: o.correct })) }
    }

    const qResp = await flashcardsApi.updateQuestion(card.idQuestion, qPayload)
    if (!qResp || qResp.status !== 200) {
      formError.value = qResp?.data?.message || 'Erreur lors de la mise à jour de la question.'
      return
    }

    // Lien au nœud de la carte mentale (null = retirer) — uniquement si une carte mentale est liée au système
    if (getMindMapJson()) {
      const cardResp = await flashcardsApi.updateCard(card.idCard, {
        idQuestion: card.idQuestion,
        mindMapNodeId: form.mindMapNodeId || null,
      })
      if (!cardResp || cardResp.status !== 200) {
        formError.value = cardResp?.data?.message || 'Erreur lors de la mise à jour du lien avec la carte mentale.'
        return
      }
    }

    // Réponse uniquement pour les cartes ouvertes
    if (!isMcq) {
      if (card.idResponse) {
        const rResp = await flashcardsApi.updateResponse(card.idResponse, { content: normalizeFormulaSyntax(form.answer) })
        if (!rResp || rResp.status !== 200) {
          formError.value = rResp?.data?.message || 'Erreur lors de la mise à jour de la réponse.'
          return
        }
        lastQuality.level = rResp.data.qualityLevel
        lastQuality.warnings = rResp.data.qualityWarnings || []
        qualitySaved.value = true
      } else if (form.answer.trim()) {
        const rResp = await flashcardsApi.createResponse({
          content: normalizeFormulaSyntax(form.answer),
          correction: true,
          idQuestion: card.idQuestion,
        })
        if (!rResp || rResp.status !== 201) {
          formError.value = rResp?.data?.message || 'Erreur lors de la création de la réponse.'
          return
        }
        lastQuality.level = rResp.data.qualityLevel
        lastQuality.warnings = rResp.data.qualityWarnings || []
        qualitySaved.value = true
      }
    }

    notif.notify('Carte mise à jour avec succès.', 'success')
    await reload()
    if (!lastQuality.level || lastQuality.level === 'high') close()
  }

  const submit = async () => {
    submitting.value = true
    formError.value = ''

    try {
      if (editingCard.value) {
        await update()
      } else {
        await create()
      }
    } finally {
      submitting.value = false
    }
  }

  return {
    showModal,
    submitting,
    formError,
    editingCard,
    form,
    lastQuality,
    qualitySaved,
    justCreated,
    openAdd,
    openEdit,
    close,
    submit,
    selectType,
    setOptionText,
    setMcqCorrect,
    addMcqOption,
    removeMcqOption,
    onNodeSelected,
  }
}
