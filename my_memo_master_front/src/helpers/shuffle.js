// Mélange (Fisher-Yates) d'une liste d'indices 0..length-1. Les indices servent à AFFICHER les options
// d'un QCM dans un ordre aléatoire sans changer leur identité : c'est l'indice d'origine qui est
// envoyé à la correction (l'API compare l'indice choisi à la bonne option).
//
// `random` est injectable pour les tests (tirage déterministe).
const shuffledIndices = (length, random = Math.random) => {
  const order = Array.from({ length }, (_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

export { shuffledIndices }
