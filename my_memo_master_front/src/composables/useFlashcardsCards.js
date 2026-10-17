import { ref, computed } from 'vue'
import { flashcardsApi } from '@/helpers/flashcards/flashcardsApi'
import { notif } from '@/helpers/notif'

/**
 * Données de la page « Gestion des cartes » d'un système de Leitner : le système (nom, sujet, carte
 * mentale liée), ses boîtes, ses cartes avec leur réponse de référence, et les suppressions.
 *
 * @param {number} systemId
 * @param {(title: string, message: string, action: Function) => void} askConfirm - demande de confirmation
 *   (modale commune, voir useConfirmAction) : la suppression ne part qu'après « Confirmer »
 */
export function useFlashcardsCards(systemId, askConfirm) {
  const loading = ref(true)
  const systemName = ref('')
  const allCards = ref([])
  const systemBoxes = ref([])

  // Nom du sujet du système (LeitnerSystem.subjectId → Subject.name), utilisé pour pré-remplir le
  // champ « Matière » (subjectContext) de la génération par IA.
  const systemSubjectName = ref('')

  // Carte mentale liée au système (LeitnerSystem.idMindMap) — alimente le sélecteur de nœud
  const mindMapJson = ref(null)

  const cardsByLevel = computed(() => {
    const map = {}
    allCards.value.forEach((card) => {
      const level = card.leitnerBox?.level ?? 1
      if (!map[level]) map[level] = []
      map[level].push(card)
    })
    return map
  })

  const loadCards = async () => {
    const [sysResp, boxResp] = await Promise.all([flashcardsApi.getSystem(systemId), flashcardsApi.listBoxes()])

    if (sysResp?.status === 200) {
      systemName.value = sysResp.data.name
      systemSubjectName.value = sysResp.data.subject?.name || ''
      // Si le système est lié à une carte mentale, on la charge pour le sélecteur de nœud
      if (sysResp.data.idMindMap) {
        const mmResp = await flashcardsApi.getMindMap(sysResp.data.idMindMap)
        mindMapJson.value = mmResp?.status === 200 ? mmResp.data?.mindMapJson || null : null
      } else {
        mindMapJson.value = null
      }
    }
    if (!boxResp || boxResp.status !== 200) return

    const boxes = boxResp.data.filter((b) => b.idSystem === systemId).sort((a, b) => a.level - b.level)
    systemBoxes.value = boxes

    const cardArrays = await Promise.all(boxes.map((box) => flashcardsApi.listBoxCards(box.idBox)))
    const cards = cardArrays.filter((r) => r?.status === 200).flatMap((r) => r.data)

    // Réponse de référence de chaque carte ouverte (la correction d'un QCM est portée par `content`)
    await Promise.all(
      cards.map(async (card) => {
        const resp = card.question?.type === 'mcq' ? undefined : await flashcardsApi.getCorrection(card.idQuestion)
        card.correctAnswer = resp?.status === 200 ? resp.data?.content || '' : ''
        card.idResponse = resp?.status === 200 ? resp.data?.idResponse || null : null
      })
    )

    allCards.value = cards
  }

  // Recharge tout en affichant l'état « Chargement… » (après une création, une modification, un ajout de boîte).
  const reload = async () => {
    loading.value = true
    await loadCards()
    loading.value = false
  }

  const deleteCard = (card) =>
    askConfirm('Supprimer la carte', `Supprimer la carte « ${card.question?.statement} » ? Cette action est irréversible.`, () => removeCard(card))

  const removeCard = async (card) => {
    const resp = await flashcardsApi.deleteCard(card.idCard)
    if (!resp || resp.status !== 200) {
      notif.notify(resp?.data?.message || 'Erreur lors de la suppression.', 'error')
      return
    }

    notif.notify('Carte supprimée.', 'success')
    allCards.value = allCards.value.filter((c) => c.idCard !== card.idCard)
  }

  const deleteBox = (box) =>
    askConfirm(
      'Supprimer la boîte',
      `Supprimer la boîte niveau ${box.level} ? Les cartes qu'elle contient resteront mais n'auront plus de boîte.`,
      () => removeBox(box),
    )

  const removeBox = async (box) => {
    const resp = await flashcardsApi.deleteBox(box.idBox)
    if (!resp || resp.status !== 200) {
      notif.notify(resp?.data?.message || 'Erreur lors de la suppression.', 'error')
      return
    }
    notif.notify('Boîte supprimée.', 'success')
    systemBoxes.value = systemBoxes.value.filter((b) => b.idBox !== box.idBox)
  }

  return {
    loading,
    systemName,
    systemSubjectName,
    mindMapJson,
    systemBoxes,
    allCards,
    cardsByLevel,
    loadCards,
    reload,
    deleteCard,
    deleteBox,
  }
}
