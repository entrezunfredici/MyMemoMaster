// Points d'accès API de la page « Exercices » (création / modification d'un test et de ses questions) :
// une seule source pour les routes, plutôt que des chaînes dispersées dans la page.
//
// Les fonctions renvoient la réponse BRUTE de `api` (statut et données) et non un booléen : la page
// affiche la vraie raison d'un échec (message serveur ou de validation) dans son formulaire, ce que les
// actions des stores `tests` / `questions` ne permettent pas — elles ne renvoient qu'un booléen et
// notifient en interne (voir le commentaire de `submitCreate` dans ExercisesPage.vue).

import { api } from '@/helpers/api';

const exercisesApi = {
  // ── Tests ──
  getTest: (testId) => api.get(`tests/${testId}`),
  createTest: (body) => api.post('tests', body),
  updateTest: (testId, body) => api.put(`tests/${testId}`, body),

  // ── Questions ──
  createQuestion: (body) => api.post('questions', body),
  updateQuestion: (questionId, body) => api.put(`questions/edit/${questionId}`, body),
  // `api.del` renvoie `undefined` quand le serveur répond 204 (pas de contenu) ; toute valeur est une erreur.
  deleteQuestion: (questionId) => api.del(`questions/${questionId}`),

  // ── Import d'un exercice généré par l'IA ──
  validateImport: (questions) => api.post('ai-exercise-generations/validate-import', { questions }),
};

export { exercisesApi };
