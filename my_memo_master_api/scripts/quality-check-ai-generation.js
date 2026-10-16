#!/usr/bin/env node
// Protocole empirique C-01.10 (« Tests qualité génération »), exécution du protocole documenté en
// diagrams/generation_ia_llm_benchmark.md §8 et rappelé comme dette dans CHANGELOG_AGENT.md (entrée
// C-01.04 du 2026-09-01) : fait tourner le prompt de génération (C-01.01) sur un petit jeu de
// référence (plusieurs matières, tailles et cas limites variés), avec de VRAIS appels à l'API
// Mistral configurée dans .env, et mesure :
//   - taux de succès (conformité de schéma, retry inclus — cf. AiCardGenerationService#generateCards)
//   - respect des garde-fous de qualité de generation_ia_prompt_cartes.md §5, non couverts par la
//     validation de schéma : anti-hallucination (sourceExcerpt réellement présent dans le texte
//     source), atomicité/absence de doublon, non-bourrage sur contenu insuffisant (warning)
//   - latence par appel
//
// Ne fait PAS partie de la suite Jest par défaut (comme e2e-a11y/ et e2e/ côté front) : appelle une
// vraie API payante, pas adapté à une exécution systématique en CI. À rejouer à la demande :
//   node scripts/quality-check-ai-generation.js
//
// Écrit un artefact JSON brut (docs/QUALITE_GENERATION_IA_RUN.json) pour traçabilité, consommé par
// docs/RAPPORT_QUALITE_GENERATION_IA.md.

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })

const fs = require('fs')
const path = require('path')
const aiCardGenerationService = require('../services/AiCardGeneration.service')
const {
  isExcerptGenuine,
  findDuplicateStatements,
  respectsShortfallWarning
} = require('../helpers/aiGenerationQualityChecks')

// --- Jeu de référence -------------------------------------------------------------------------
// Plusieurs matières, tailles variées, et 2 cas limites volontaires (contenu insuffisant,
// cardCount disproportionné) — cf. protocole du benchmark §8.

const FIXTURES = [
  {
    id: 'svt-photosynthese',
    subjectContext: 'SVT',
    cardType: 'open',
    cardCount: 3,
    outputLanguage: 'fr',
    note: 'Cas nominal, taille modeste — reprend le texte d\'exemple de generation_ia_prompt_cartes.md §9.',
    sourceText:
      "La photosynthèse est le processus par lequel les plantes, les algues et certaines bactéries " +
      "convertissent l'énergie lumineuse en énergie chimique. Elle se déroule principalement dans les " +
      'chloroplastes, grâce à un pigment appelé chlorophylle. Le processus consomme du dioxyde de carbone ' +
      "et de l'eau, et produit du glucose et de l'oxygène."
  },
  {
    id: 'histoire-revolution',
    subjectContext: 'Histoire',
    cardType: 'open',
    cardCount: 4,
    outputLanguage: 'fr',
    note: 'Cas nominal, texte plus long et plus dense en dates/faits.',
    sourceText:
      "La Révolution française débute en 1789 avec la convocation des États généraux, réunis à Versailles " +
      "le 5 mai 1789 pour résoudre la crise financière du royaume. Le 14 juillet 1789, la prise de la " +
      "Bastille marque le début de l'insurrection populaire à Paris. Dans la nuit du 4 août 1789, " +
      "l'Assemblée constituante abolit les privilèges féodaux. Le 26 août 1789, elle adopte la Déclaration " +
      "des droits de l'homme et du citoyen, qui proclame la liberté, l'égalité et la propriété comme droits " +
      "naturels. La monarchie constitutionnelle est instaurée en 1791, avant que la Première République ne " +
      'soit proclamée le 21 septembre 1792.'
  },
  {
    id: 'maths-pythagore-mcq',
    subjectContext: 'Mathématiques',
    cardType: 'mcq',
    cardCount: 3,
    outputLanguage: 'fr',
    note: 'Cas nominal QCM — vérifie options 3-4, exactement 1 bonne réponse (déjà couvert par le schéma, revérifié ici).',
    sourceText:
      "Le théorème de Pythagore énonce que, dans un triangle rectangle, le carré de la longueur de " +
      "l'hypoténuse est égal à la somme des carrés des longueurs des deux autres côtés. Si l'hypoténuse " +
      'mesure c et les deux autres côtés a et b, alors c² = a² + b². Ce théorème permet de calculer la ' +
      'longueur d\'un côté inconnu d\'un triangle rectangle si les deux autres sont connues.'
  },
  {
    id: 'anglais-source-sortie-fr',
    subjectContext: 'Biologie',
    cardType: 'open',
    cardCount: 2,
    outputLanguage: 'fr',
    note: 'Texte source en anglais, sortie demandée en français — vérifie §5.4 (langue de sortie indépendante de la langue source).',
    sourceText:
      'Mitochondria are membrane-bound organelles found in most eukaryotic cells. They are often described ' +
      'as the "powerhouse of the cell" because they generate most of the cell\'s supply of adenosine ' +
      'triphosphate (ATP), used as a source of chemical energy. Mitochondria have their own DNA, separate ' +
      'from the nuclear DNA of the cell.'
  },
  {
    id: 'contenu-insuffisant',
    subjectContext: 'Physique',
    cardType: 'open',
    cardCount: 5,
    outputLanguage: 'fr',
    note: 'Cas limite §5.3/§7 : texte source très court pour un cardCount élevé — attendu : moins de cartes que demandé + warning, jamais de bourrage.',
    sourceText: "La vitesse de la lumière dans le vide est d'environ 299 792 458 mètres par seconde."
  },
  {
    id: 'cardcount-disproportionne',
    subjectContext: 'Chimie',
    cardType: 'open',
    cardCount: 15,
    outputLanguage: 'fr',
    note: "Cas limite §5.3/§7 : cardCount délibérément disproportionné par rapport à la taille du chunk.",
    sourceText:
      "L'eau est une molécule composée de deux atomes d'hydrogène et d'un atome d'oxygène, de formule " +
      'chimique H2O. Elle existe sous trois états : solide (glace), liquide et gazeux (vapeur).'
  },
  {
    id: 'type-mixed',
    subjectContext: 'Géographie',
    cardType: 'mixed',
    cardCount: 4,
    outputLanguage: 'fr',
    note: "cardType 'mixed' — le modèle choisit open/mcq carte par carte, aucune contrainte de type imposée.",
    sourceText:
      "La France métropolitaine compte 13 régions administratives depuis la réforme territoriale de 2016. " +
      "Paris, sa capitale, est traversée par la Seine. Le point culminant du pays est le mont Blanc, qui " +
      "culmine à 4 805 mètres d'altitude dans les Alpes. La France partage des frontières terrestres avec " +
      'huit pays : Belgique, Luxembourg, Allemagne, Suisse, Italie, Monaco, Espagne et Andorre.'
  }
]

/**
 * Exécute une génération réelle et calcule les indicateurs de qualité pour un fixture donné.
 * @param {object} fixture
 * @returns {Promise<object>} résultat détaillé, jamais lève (échec capturé et renvoyé comme résultat)
 */
async function runFixture(fixture) {
  const startedAt = Date.now()
  try {
    const result = await aiCardGenerationService.generateCards({
      sourceText: fixture.sourceText,
      subjectContext: fixture.subjectContext,
      cardCount: fixture.cardCount,
      cardType: fixture.cardType,
      outputLanguage: fixture.outputLanguage
    })
    const latencyMs = Date.now() - startedAt

    const cards = result.cards || []
    const excerptChecks = cards.map((c) => isExcerptGenuine(c.sourceExcerpt, fixture.sourceText))
    const genuineExcerptCount = excerptChecks.filter(Boolean).length
    const duplicates = findDuplicateStatements(cards)
    const shortfallOk = respectsShortfallWarning(result, fixture.cardCount)
    const mcqCorrectCounts = cards
      .filter((c) => c.type === 'mcq')
      .map((c) => (c.options || []).filter((o) => o && o.correct === true).length)

    return {
      id: fixture.id,
      note: fixture.note,
      success: true,
      latencyMs,
      requestedCardCount: fixture.cardCount,
      producedCardCount: cards.length,
      warning: result.warning,
      usage: result.usage,
      genuineExcerptCount,
      genuineExcerptRate: cards.length ? genuineExcerptCount / cards.length : null,
      duplicateCount: duplicates.length,
      duplicates,
      shortfallWarningRespected: shortfallOk,
      mcqCorrectCounts,
      cards
    }
  } catch (error) {
    return {
      id: fixture.id,
      note: fixture.note,
      success: false,
      latencyMs: Date.now() - startedAt,
      error: error.message,
      statusCode: error.statusCode ?? null
    }
  }
}

async function main() {
  console.log(`Protocole qualité génération IA — ${FIXTURES.length} fixtures, modèle configuré : ${process.env.MISTRAL_MODEL || '(défaut)'}\n`)

  const results = []
  for (const fixture of FIXTURES) {
    process.stdout.write(`→ ${fixture.id}... `)
    // Séquentiel, volontairement : pas de course contre le rate-limit Mistral, et facilite la
    // lecture des logs en cas d'échec sur un fixture précis.
    const result = await runFixture(fixture)
    results.push(result)
    console.log(result.success ? `OK (${result.latencyMs} ms, ${result.producedCardCount}/${result.requestedCardCount} cartes)` : `ÉCHEC (${result.error})`)
  }

  const succeeded = results.filter((r) => r.success)
  const summary = {
    runAt: new Date().toISOString(),
    model: process.env.MISTRAL_MODEL || null,
    fixtureCount: FIXTURES.length,
    successCount: succeeded.length,
    successRate: succeeded.length / FIXTURES.length,
    averageLatencyMs: succeeded.length
      ? Math.round(succeeded.reduce((sum, r) => sum + r.latencyMs, 0) / succeeded.length)
      : null,
    totalCardsProduced: succeeded.reduce((sum, r) => sum + r.producedCardCount, 0),
    totalGenuineExcerpts: succeeded.reduce((sum, r) => sum + r.genuineExcerptCount, 0),
    totalDuplicates: succeeded.reduce((sum, r) => sum + r.duplicateCount, 0),
    shortfallCasesRespected: succeeded.filter((r) => r.shortfallWarningRespected).length,
    shortfallCasesTotal: succeeded.filter((r) => r.producedCardCount < r.requestedCardCount).length
  }

  const output = { summary, results }
  const outPath = path.resolve(__dirname, '../../docs/QUALITE_GENERATION_IA_RUN.json')
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8')

  console.log('\n--- Résumé ---')
  console.log(`Succès : ${summary.successCount}/${summary.fixtureCount} (${(summary.successRate * 100).toFixed(0)} %)`)
  console.log(`Latence moyenne : ${summary.averageLatencyMs} ms`)
  console.log(`Extraits sourceExcerpt réellement présents : ${summary.totalGenuineExcerpts}/${summary.totalCardsProduced}`)
  console.log(`Doublons détectés : ${summary.totalDuplicates}`)
  console.log(`Cas de contenu insuffisant avec warning respecté : ${summary.shortfallCasesRespected}/${summary.shortfallCasesTotal}`)
  console.log(`\nArtefact brut écrit dans ${outPath}`)
}

main().catch((error) => {
  console.error('Échec du protocole :', error)
  process.exitCode = 1
})
