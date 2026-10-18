import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder';
import { hasFormulaContent, isGraphNode } from '@/helpers/mindmap/mindmapItems';
import { renderMathMultiline } from '@/components/interpreter/interpreter.js';
import { missingVariables } from '@/helpers/mindmap/mindmapCalc';

/**
 * Saisie d'une formule / fonction pour le nœud sélectionné de la palette : contenu en cours d'édition,
 * ouverture de l'interpréteur, aperçu KaTeX et proposition de créer les grandeurs des variables.
 * Extrait de MindMapPalette.vue sans changement de comportement.
 *
 * @param {import('vue').ComputedRef<object>} node - Nœud sélectionné.
 * @returns {object} État et actions de l'édition de formule.
 */
export function usePaletteFormula(node) {
  const store = useMindMapBuilderStore();

  const editableContent = ref('');
  const interpreterValue = ref('');
  const variablePrompt = ref(null);

  const isFormulaNodeSelected = computed(() => hasFormulaContent(node.value));
  const isGraphNodeSelected = computed(() => isGraphNode(node.value));

  watch(() => store.interpreterOpen, (open) => {
    if (open && (isFormulaNodeSelected.value || isGraphNodeSelected.value)) {
      interpreterValue.value = editableContent.value || node.value?.content || '';
    }
  });

  const formulaPreviewHtml = computed(() =>
    (isFormulaNodeSelected.value || isGraphNodeSelected.value) && editableContent.value
      ? renderMathMultiline(editableContent.value)
      : ''
  );

  // Changer de nœud relit son contenu et ferme l'interpréteur resté ouvert.
  watch(
    node,
    (current) => {
      editableContent.value = current?.content || '';
      if (isFormulaNodeSelected.value || isGraphNodeSelected.value) interpreterValue.value = current?.content || '';
      else interpreterValue.value = '';
      store.closeInterpreter();
    },
    { immediate: true }
  );

  // Désélectionner (la section démonte) referme l'interpréteur resté ouvert, comme l'ancienne palette.
  onBeforeUnmount(() => store.closeInterpreter());

  const openInterpreter = () => {
    interpreterValue.value = editableContent.value || '';
    store.openInterpreter();
  };

  const closeInterpreter = () => { store.closeInterpreter(); };

  // Activer « Formule » / « Fonction » sur un texte ou une grandeur propose directement l'éditeur de formule.
  const startFormulaEdit = () => {
    const current = node.value;
    // Le texte par défaut (titre recopié) n'a pas de sens comme formule : on part d'une saisie vide.
    if (current.content === current.label) {
      editableContent.value = '';
      store.updateNode(current.id, { content: '' });
    }
    interpreterValue.value = editableContent.value || current.content || '';
    store.openInterpreter();
  };

  // Après saisie d'une formule : propose de créer les grandeurs des variables qui n'en ont pas encore.
  const proposeVariables = (nodeId) => {
    const missing = missingVariables(store.map, nodeId);
    variablePrompt.value = missing.length ? { nodeId, symbols: missing } : null;
  };

  const applyInterpreter = (value) => {
    const current = node.value;
    const nextValue = typeof value === 'string' ? value : interpreterValue.value ?? editableContent.value ?? '';
    interpreterValue.value = nextValue;
    editableContent.value = nextValue;
    store.updateNode(current.id, { content: nextValue });
    store.closeInterpreter();
    if (!isGraphNodeSelected.value) proposeVariables(current.id);
  };

  const confirmVariablePrompt = (symbols) => {
    const prompt = variablePrompt.value;
    variablePrompt.value = null;
    if (prompt && symbols.length) store.createQuantitiesForFormula(prompt.nodeId, symbols);
  };

  const dismissVariablePrompt = () => { variablePrompt.value = null; };

  const clearFormulaContent = () => {
    editableContent.value = '';
    store.updateNode(node.value.id, { content: '' });
  };

  return {
    editableContent,
    interpreterValue,
    variablePrompt,
    isFormulaNodeSelected,
    isGraphNodeSelected,
    formulaPreviewHtml,
    openInterpreter,
    closeInterpreter,
    startFormulaEdit,
    applyInterpreter,
    confirmVariablePrompt,
    dismissVariablePrompt,
    clearFormulaContent,
  };
}
