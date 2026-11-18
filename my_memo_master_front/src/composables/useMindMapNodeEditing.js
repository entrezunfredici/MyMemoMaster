import { computed, inject, provide, ref } from 'vue';

// Un item de carte n'édite qu'un champ à la fois (titre, contenu ou grandeur) : ce champ est partagé,
// de façon synchrone, entre l'item et ses sous-composants (`components/mindmap/node/`). Extrait de MindMapNode.vue.
const NODE_EDITING_KEY = Symbol('mindmapNodeEditing');

// Fournie par le plateau en lecture seule (page de partage public) : aucun item ne doit alors s'éditer.
export const MINDMAP_READONLY_KEY = Symbol('mindmapReadonly');

/**
 * Crée et fournit aux sous-composants le champ en cours d'édition d'un item.
 *
 * @param {boolean} [readonly=false] - En lecture seule, le champ reste toujours à null : les
 *   sous-composants peuvent « ouvrir » l'édition (double-clic) sans qu'elle s'affiche.
 * @returns {import('vue').Ref<('label'|'content'|'quantity'|null)>} Champ en cours d'édition (null = aucun).
 */
export function provideNodeEditing(readonly = false) {
  // CHOIX: ref calculée sans effet à l'écriture plutôt qu'un test dans chaque sous-composant
  // RAISON: NodeTitle, NodeTextBody et NodeQuantity écrivent tous `editingField.value = ...` ; les
  // garder inchangés évite d'oublier un point d'entrée d'édition dans la vue publique.
  const editingField = readonly ? computed({ get: () => null, set: () => {} }) : ref(null);
  provide(NODE_EDITING_KEY, editingField);
  return editingField;
}

/**
 * Récupère le champ en cours d'édition fourni par l'item parent.
 *
 * @returns {import('vue').Ref<('label'|'content'|'quantity'|null)>} Champ en cours d'édition partagé.
 * @throws {Error} Quand le composant n'est pas rendu dans un item qui a appelé `provideNodeEditing`.
 */
export function useNodeEditing() {
  const editingField = inject(NODE_EDITING_KEY, null);
  if (!editingField) throw new Error("useNodeEditing doit être utilisé dans un item de carte (provideNodeEditing)");
  return editingField;
}
