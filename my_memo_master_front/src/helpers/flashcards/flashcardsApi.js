// Points d'accès API de la gestion des cartes d'un système de Leitner : une seule source pour les
// routes, plutôt que des chaînes dispersées dans la page et ses fenêtres. Les fonctions renvoient la
// réponse brute de `api` (statut et données) : chaque appelant sait quel statut attendre et quel
// message afficher.

import { api } from '@/helpers/api';

const flashcardsApi = {
  // ── Lecture ──
  getSystem: (systemId) => api.get(`leitnersystems/${systemId}`),
  getMindMap: (mindMapId) => api.get(`diagrammes/${mindMapId}`),
  listBoxes: () => api.get('leitnerboxes'),
  listBoxCards: (boxId) => api.get(`leitnercards/leitnerboxes/${boxId}`),
  // CHOIX: /responses/correction/:id plutôt que /responses/question/:id — ce dernier ne renvoie que
  // les réponses `correction: false`, jamais la réponse de référence. 404 attendu pour une carte QCM.
  getCorrection: (questionId) => api.get(`responses/correction/${questionId}`),
  previewQuality: (body) => api.post('responses/quality-preview', body),

  // ── Questions, réponses, cartes ──
  createQuestion: (body) => api.post('questions', body),
  updateQuestion: (questionId, body) => api.put(`questions/edit/${questionId}`, body),
  createResponse: (body) => api.post('responses', body),
  updateResponse: (responseId, body) => api.put(`responses/edit/${responseId}`, body),
  createCard: (body) => api.post('leitnercards', body),
  updateCard: (cardId, body) => api.put(`leitnercards/${cardId}`, body),
  deleteCard: (cardId) => api.del(`leitnercards/${cardId}`),

  // ── Boîtes ──
  createBox: (body) => api.post('leitnerboxes', body),
  updateBox: (boxId, body) => api.put(`leitnerboxes/${boxId}`, body),
  deleteBox: (boxId) => api.del(`leitnerboxes/${boxId}`),
};

export { flashcardsApi };
