#!/usr/bin/env node
/**
 * Test ponctuel du prompt de génération de cartes IA (AiCardGeneration.service.js) sur un extrait
 * réel de cours, en appelant le vrai modèle Mistral (MISTRAL_API_KEY lu dans le .env racine, jamais
 * en argument CLI). Sert à vérifier concrètement l'effet des règles 9-10 du prompt système avant/
 * après ajustement, sans passer par l'API HTTP ni une base de données.
 *
 * Usage :
 *   node scripts/test-ai-generation.js <fichier-texte> <cardCount> <cardType> [subjectContext]
 *
 * Exemple :
 *   node scripts/test-ai-generation.js /tmp/extrait.txt 4 open Thermodynamique
 */
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') })

const AiCardGenerationService = require('../services/AiCardGeneration.service')

async function main() {
  const [sourceFile, cardCountArg, cardType, subjectContext] = process.argv.slice(2)
  if (!sourceFile || !cardCountArg) {
    console.error('Usage: node scripts/test-ai-generation.js <fichier-texte> <cardCount> <cardType> [subjectContext]')
    process.exit(1)
  }

  const sourceText = fs.readFileSync(sourceFile, 'utf8')
  const cardCount = parseInt(cardCountArg, 10)

  const result = await AiCardGenerationService.generateCards({
    sourceText,
    subjectContext: subjectContext || null,
    cardCount,
    cardType: cardType || 'open',
    outputLanguage: 'fr'
  })

  console.log(JSON.stringify(result, null, 2))
}

main().catch((e) => {
  console.error('ERR', e.message)
  process.exit(1)
})
