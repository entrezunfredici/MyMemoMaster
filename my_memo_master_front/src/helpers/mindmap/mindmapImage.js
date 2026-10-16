// Envoi d'une image vers un item « Image » de carte mentale (glisser-déposer sur le nœud ou
// sélection de fichier dans la palette) : une seule implémentation pour les deux chemins.

import { mindmapApi } from './mindmapApi';
import { VITE_API_URL } from '@/config';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 Mo, limite côté API

class ImageUploadError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

// URL absolue d'une image à partir de la réponse de l'API (`path` relatif au serveur, ou `url`).
const resolveImageUrl = (payload = {}) => {
  if (!payload) return '';
  if (payload.path) {
    try { return new URL(payload.path, VITE_API_URL).toString(); }
    catch { return payload.path; }
  }
  return payload.url || '';
};

// Envoie le fichier et retourne l'URL de l'image enregistrée.
// Lève ImageUploadError : IMAGE_TOO_LARGE, UPLOAD_FAILED ou INVALID_IMAGE_URL.
const uploadMindmapImage = async (file) => {
  if (file.size > MAX_IMAGE_SIZE) throw new ImageUploadError('IMAGE_TOO_LARGE');
  const formData = new FormData();
  formData.append('image', file);
  let response;
  try {
    response = await mindmapApi.uploadImage(formData);
  } catch {
    throw new ImageUploadError('UPLOAD_FAILED');
  }
  if (!response?.data) throw new ImageUploadError('UPLOAD_FAILED');
  const url = resolveImageUrl(response.data);
  if (!url) throw new ImageUploadError('INVALID_IMAGE_URL');
  return url;
};

export { MAX_IMAGE_SIZE, ImageUploadError, resolveImageUrl, uploadMindmapImage };
