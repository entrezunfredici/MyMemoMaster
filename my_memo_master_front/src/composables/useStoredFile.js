// Ouverture et téléchargement d'un fichier du stockage objet (rendus d'étudiants, ressources de classe).
//
// L'API ne donne jamais l'URL définitive d'un fichier : elle délivre, à la demande, une URL pré-signée
// à durée limitée (`GET storage/presign`). Ce composable centralise cette demande, qui était dupliquée
// dans les vues enseignant et étudiant.
//
// `openFile` ouvre d'abord une fenêtre vide DANS le geste de l'utilisateur (sinon le navigateur bloque la
// fenêtre), puis y charge l'URL une fois obtenue ; en cas d'échec la fenêtre vide est refermée.

import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

const PRESIGN_ROUTE = 'storage/presign'

export function useStoredFile() {
  async function fetchPresignedUrl(fileKey, params = {}) {
    const resp = await api.get(PRESIGN_ROUTE, { key: fileKey, ...params })
    return resp?.status === 200 && resp.data?.url ? resp.data.url : null
  }

  /**
   * Télécharge le fichier (Content-Disposition: attachment).
   * @param {string} fileKey - clé de l'objet dans le stockage
   * @param {{ newTab?: boolean }} [options] - `newTab` : lien ouvert dans un nouvel onglet (rel=noopener) au lieu de
   *   remplacer la page courante
   */
  async function downloadFile(fileKey, options) {
    // `options` peut être absent, null ou (anciens appels) un simple libellé : seul `newTab: true` compte.
    const newTab = options?.newTab === true
    if (!fileKey) {
      notif.notify('Aucun fichier associé.', 'error')
      return
    }
    try {
      const url = await fetchPresignedUrl(fileKey, { disposition: 'attachment' })
      if (!url) {
        notif.notify('Impossible de télécharger le fichier.', 'error')
        return
      }
      if (newTab) {
        const a = document.createElement('a')
        a.href = url
        a.target = '_blank'
        a.rel = 'noopener'
        a.click()
      } else {
        window.location.href = url
      }
    } catch {
      notif.notify('Impossible de télécharger le fichier.', 'error')
    }
  }

  /** Affiche le fichier dans un nouvel onglet. */
  async function openFile(fileKey) {
    if (!fileKey) {
      notif.notify('Aucun fichier associé.', 'error')
      return
    }
    const newWindow = window.open('', '_blank')
    if (!newWindow) {
      notif.notify('Popup bloqué — autorisez les popups pour ce site.', 'error')
      return
    }
    try {
      const url = await fetchPresignedUrl(fileKey)
      if (url) {
        newWindow.location.href = url
      } else {
        newWindow.close()
        notif.notify("Impossible d'ouvrir le fichier.", 'error')
      }
    } catch {
      newWindow.close()
      notif.notify("Impossible d'ouvrir le fichier.", 'error')
    }
  }

  return { openFile, downloadFile }
}
