/**
 * Import d'une carte mentale depuis un fichier JSON (export de l'éditeur ou ancien format).
 * La validation est volontairement stricte : `normalizeMindMap` accepte presque n'importe quoi
 * et remplace un contenu inconnu par une carte vide, ce qui masquerait un mauvais fichier.
 */
import { normalizeMindMap, serializeMindMap } from '@/helpers/mindmap/mindmap';

// Au-delà, un fichier n'est plus une carte mentale (les images sont des liens, pas des données).
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
export const MAX_NAME_LENGTH = 50;

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Lit et valide le texte d'un fichier JSON de carte mentale.
 *
 * @param {string} text - Contenu du fichier
 * @returns {{ name: string, payload: object }} Nom (50 caractères max) et carte normalisée prête à enregistrer
 * @throws {Error} Message en français quand le fichier n'est pas une carte mentale exploitable
 */
export function parseMindMapJson(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Ce fichier n'est pas un JSON valide.");
  }

  const isCurrentFormat = isPlainObject(raw) && isPlainObject(raw.nodes) && Array.isArray(raw.links);
  const isLegacyFormat = isPlainObject(raw) && Array.isArray(raw.nodeDataArray) && Array.isArray(raw.linkDataArray);
  if (!isCurrentFormat && !isLegacyFormat) {
    throw new Error("Ce fichier n'est pas une carte mentale MyMemoMaster.");
  }
  if (isCurrentFormat && Object.keys(raw.nodes).length === 0) {
    throw new Error('Cette carte mentale ne contient aucun élément.');
  }

  const payload = serializeMindMap(normalizeMindMap(raw));
  // Les flashcards liées appartiennent à l'auteur du fichier : les garder ferait appeler l'API
  // sur des systèmes que l'importateur ne possède pas.
  Object.values(payload.nodes).forEach((node) => {
    delete node.idCard;
    delete node.idSystem;
  });
  const title = String(payload.title || '').trim() || 'Carte importée';
  return { name: title.slice(0, MAX_NAME_LENGTH), payload };
}

/**
 * Lit un fichier choisi par l'utilisateur, après contrôle de sa taille.
 *
 * @param {File} file - Fichier sélectionné
 * @returns {Promise<{ name: string, payload: object }>} Voir {@link parseMindMapJson}
 * @throws {Error} Fichier trop volumineux ou contenu invalide
 */
export async function readMindMapFile(file) {
  if (!file) throw new Error('Aucun fichier sélectionné.');
  if (file.size > MAX_IMPORT_BYTES) throw new Error('Ce fichier est trop volumineux (10 Mo maximum).');
  const text = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
    reader.readAsText(file);
  });
  return parseMindMapJson(text);
}
