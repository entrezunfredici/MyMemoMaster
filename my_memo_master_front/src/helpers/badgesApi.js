// Points d'accès API des badges (C-06) : une seule source pour les routes, comme flashcardsApi.js.
// Les fonctions renvoient la réponse brute de `api` ; le store décide des notifications.

import { api } from '@/helpers/api'

const badgesApi = {
  /** Catalogue complet avec l'état de l'utilisateur (obtenu ou progression). */
  list: () => api.get('badges'),
  /** Niveau, nombre de badges obtenus, séries. */
  summary: () => api.get('badges/me/summary'),
  /** Marque des badges comme vus (retire la pastille « Nouveau »). */
  markSeen: (codes) => api.patch('badges/me/seen', { codes }),
}

export { badgesApi }
