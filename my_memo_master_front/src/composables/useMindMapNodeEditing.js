import { inject, provide, ref } from 'vue';

// Un item de carte n'édite qu'un champ à la fois (titre, contenu ou grandeur) : ce champ est partagé,
// de façon synchrone, entre l'item et ses sous-composants (`components/mindmap/node/`). Extrait de MindMapNode.vue.
const NODE_EDITING_KEY = Symbol('mindmapNodeEditing');

/**
 * Crée et fournit aux sous-composants le champ en cours d'édition d'un item.
 *
 * @returns {import('vue').Ref<('label'|'content'|'quantity'|null)>} Champ en cours d'édition (null = aucun).
 */
export function provideNodeEditing() {
  const editingField = ref(null);
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
