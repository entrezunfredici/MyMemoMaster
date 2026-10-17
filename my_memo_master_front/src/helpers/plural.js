// Accord en nombre à la française : 0 et 1 prennent le SINGULIER (« 0 contenu », « 1 contenu »,
// « 2 contenus »), contrairement à l'anglais (« 0 items »). Un test `n !== 1` donnait « 0 contenus ».
//
// @param {number} n
// @param {string} singular - forme du singulier ("contenu")
// @param {string} [pluralForm] - forme du pluriel si elle n'est pas « singulier + s » ("cheval" -> "chevaux")
export function plural(n, singular, pluralForm = `${singular}s`) {
  return Math.abs(Number(n)) >= 2 ? pluralForm : singular
}
