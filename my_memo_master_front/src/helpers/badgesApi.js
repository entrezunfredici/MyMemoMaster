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
  /** Progression de l'objectif quotidien : { date, cards, exercises, achieved }. */
  dailyGoal: () => api.get('badges/me/daily-goal'),
  /** Bilan de fin de session : { date, firstOfDay, practicesToday, streakCurrent, streakBest, streakExtended, dailyGoalAchieved }. */
  sessionFeedback: () => api.get('badges/me/session-feedback'),
  /** Défi du jour : { date, available, subject, daysSince, done, practicesToday }. */
  dailyChallenge: () => api.get('badges/me/daily-challenge'),
  /** Niveau (Novice à Expert) dans chaque matière où l'utilisateur a une activité. */
  subjectLevels: () => api.get('badges/me/subject-levels'),
  /** Administration : remplace les matières liées à un badge restreignable (liste vide = badge global). */
  setSubjects: (code, subjectIds) => api.put(`badges/${encodeURIComponent(code)}/subjects`, { subjectIds }),
  /** Badges obtenus dont l'obtention n'a pas encore été vue (modale d'animation). */
  recent: () => api.get('badges/me/recent'),
  /** Réglages de gamification (objectifs, rappel, visibilité enseignant, animations, mode zen). */
  settings: () => api.get('badges/me/settings'),
  /** Modifie une partie des réglages. */
  updateSettings: (patch) => api.patch('badges/me/settings', patch),
}

export { badgesApi }
