// Modale de confirmation unique pour les actions destructrices d'une vue (supprimer une section, une
// échéance, une ressource, retirer un membre) plutôt qu'une modale par action.
//
// La page appelle `provideConfirmAction()` et affiche la modale ; chaque panneau enfant appelle
// `useConfirmAction()` pour obtenir `askConfirm(titre, message, action)` sans connaître la page.

import { inject, provide, reactive } from 'vue'

export const CONFIRM_ACTION_KEY = Symbol('confirmAction')

export function provideConfirmAction() {
  const confirmModal = reactive({ visible: false, title: '', message: '', action: null })

  function askConfirm(title, message, action) {
    confirmModal.title = title
    confirmModal.message = message
    confirmModal.action = action
    confirmModal.visible = true
  }

  function closeConfirmModal() {
    confirmModal.visible = false
    confirmModal.action = null
  }

  async function runConfirmedAction() {
    const action = confirmModal.action
    confirmModal.visible = false
    confirmModal.action = null
    if (action) await action()
  }

  provide(CONFIRM_ACTION_KEY, askConfirm)
  return { confirmModal, askConfirm, closeConfirmModal, runConfirmedAction }
}

export function useConfirmAction() {
  const askConfirm = inject(CONFIRM_ACTION_KEY, null)
  if (!askConfirm) {
    throw new Error('useConfirmAction() : aucun parent n’a appelé provideConfirmAction().')
  }
  return askConfirm
}
