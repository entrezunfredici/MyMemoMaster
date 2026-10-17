import { api } from '@/helpers/api'

/**
 * Supprime un fichier fraîchement téléversé quand l'enregistrement qui devait le référencer a échoué
 * (remise refusée, ressource invalide…). Sans cela, le fichier reste orphelin dans le stockage.
 * Au mieux : une erreur de nettoyage ne doit jamais masquer l'échec d'origine.
 *
 * @param {string|null|undefined} key - Clé de stockage renvoyée par `storage/upload`
 */
export async function discardUploadedFile(key) {
  if (!key) return
  try {
    await api.del(`storage/file?key=${encodeURIComponent(key)}`)
  } catch {
    // volontairement ignoré
  }
}
