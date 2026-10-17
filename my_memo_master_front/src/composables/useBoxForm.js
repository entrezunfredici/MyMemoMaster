import { ref, reactive } from 'vue'
import { flashcardsApi } from '@/helpers/flashcards/flashcardsApi'
import { notif } from '@/helpers/notif'
import { boxColorToHex, hexToBoxColor } from '@/helpers/mindmap/mindmap'

/**
 * Formulaire d'ajout / modification d'une boîte de Leitner (niveau, intervalle, couleur).
 *
 * @param {object} options
 * @param {number} options.systemId
 * @param {() => object[]} options.getBoxes - boîtes actuelles du système (couleur proposée à l'ajout)
 * @param {() => Promise<void>} options.reload - recharge les cartes de la page après un enregistrement
 */
export function useBoxForm({ systemId, getBoxes, reload }) {
  const showModal = ref(false)
  const submitting = ref(false)
  const formError = ref('')
  const editingBox = ref(null)
  const boxForm = reactive({ level: '', intervall: '', color: boxColorToHex(null) })

  const openAdd = () => {
    editingBox.value = null
    // Pré-remplit avec la couleur de la dernière boîte du système (réglable ensuite).
    const lastBox = getBoxes().reduce((last, b) => (!last || b.level > last.level ? b : last), null)
    boxForm.level = ''
    boxForm.intervall = ''
    boxForm.color = boxColorToHex(lastBox?.color)
    formError.value = ''
    showModal.value = true
  }

  const openEdit = (box) => {
    editingBox.value = box
    boxForm.level = box.level
    boxForm.intervall = box.intervall
    boxForm.color = boxColorToHex(box.color)
    formError.value = ''
    showModal.value = true
  }

  const close = () => {
    showModal.value = false
    editingBox.value = null
    boxForm.level = ''
    boxForm.intervall = ''
    boxForm.color = boxColorToHex(null)
    formError.value = ''
  }

  const submit = async () => {
    submitting.value = true
    formError.value = ''
    const data = {
      level: Number(boxForm.level),
      intervall: Number(boxForm.intervall),
      color: hexToBoxColor(boxForm.color),
      idSystem: systemId,
    }
    const resp = editingBox.value
      ? await flashcardsApi.updateBox(editingBox.value.idBox, data)
      : await flashcardsApi.createBox(data)
    const expectedStatus = editingBox.value ? 200 : 201
    if (!resp || resp.status !== expectedStatus) {
      formError.value = resp?.data?.message || "Erreur lors de l'enregistrement."
      submitting.value = false
      return
    }
    notif.notify(editingBox.value ? 'Boîte mise à jour.' : 'Boîte ajoutée.', 'success')
    close()
    await reload()
    submitting.value = false
  }

  return { showModal, submitting, formError, editingBox, boxForm, openAdd, openEdit, close, submit }
}
