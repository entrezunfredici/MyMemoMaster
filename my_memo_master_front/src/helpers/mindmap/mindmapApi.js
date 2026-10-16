// Points d'accès API de la fonctionnalité « cartes mentales » : une seule source pour les routes,
// plutôt que des chaînes dispersées dans les composants (liste, éditeur, palette).
// Les fonctions renvoient la réponse brute de `api` (statut et données) : la gestion des erreurs
// et des notifications reste à l'appelant, qui connaît son contexte.

import { api } from '@/helpers/api';

const mindmapApi = {
  // ── Cartes mentales (diagrammes) ──
  listDiagrams: () => api.get('diagrammes'),
  createDiagram: (body) => api.post('diagrammes', body),
  updateDiagram: (id, body) => api.put(`/diagrammes/${id}`, body),
  deleteDiagram: (id) => api.del(`diagrammes/${id}`),
  uploadImage: (formData) =>
    api.post('diagrammes/upload-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

  // ── Flashcards Leitner reliables à un item ──
  listLeitnerSystems: () => api.get('leitnersystems/'),
  listSystemCards: (systemId) => api.get(`leitnercards/system/${systemId}`),
};

export { mindmapApi };
