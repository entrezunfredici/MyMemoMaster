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
  /** Titre affiché et vitrine : { titleCode, showcaseCodes }. */
  profile: () => api.get('badges/me/profile'),
  /** Enregistre titre et/ou vitrine (une clé absente garde l'ancienne valeur). */
  saveProfile: (data) => api.put('badges/me/profile', data),
  /** Jours d'activité des dernières semaines (calendrier). */
  activity: (weeks = 12) => api.get('badges/me/activity', { weeks }),
  /** Réglages de gamification (objectifs, rappel, visibilité enseignant, animations, mode zen). */
  settings: () => api.get('badges/me/settings'),
  /** Modifie une partie des réglages. */
  updateSettings: (patch) => api.patch('badges/me/settings', patch),
}

export { badgesApi }
