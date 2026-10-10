#!/usr/bin/env node
// Banc de correction (Mistral). Appelle la VRAIE API (clé MISTRAL_API_KEY du .env racine) sur
// scripts/grading-bench/cases.js et vérifie que chaque note tombe dans la plage attendue.
// Hors suite Jest (API payante) ; à rejouer après toute modification du prompt de correction :
//   node scripts/quality-check-grading.js [--runs 2]
// Appelle callJudge directement : contourne le cache Redis, donc mesure le prompt, pas le cache.

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })

const service = require('../services/MistralGrading.service')
const cases = require('./grading-bench/cases')

const runsArg = process.argv.indexOf('--runs')
const RUNS = runsArg > -1 ? parseInt(process.argv[runsArg + 1], 10) || 1 : 1

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Reprise sur 429 (limite de débit de l'API) : attente croissante, le banc n'est pas urgent.
async function judge(question, refs, text) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await service.callJudge(question, refs, text)
    } catch (error) {
      if (!/429/.test(error.message) || attempt >= 6) throw error
      await sleep(2000 * attempt)
    }
  }
}

async function main() {
  const rows = []
  for (const c of cases) {
    for (const a of c.answers) {
      for (let run = 1; run <= RUNS; run++) {
        const verdict = await judge(c.question, c.refs, a.text)
        await sleep(500)
        rows.push({
          q: c.question.slice(0, 40),
          text: a.text,
          note: a.note,
          expected: `${a.min}-${a.max}`,
          score: verdict.score,
          reason: verdict.reason,
          ok: verdict.score >= a.min && verdict.score <= a.max
        })
      }
    }
  }
  const failed = rows.filter((r) => !r.ok)
  for (const r of failed) {
    console.log(`✗ [${r.q}…] « ${r.text} » attendu ${r.expected}, obtenu ${r.score}${r.note ? ` (${r.note})` : ''}\n    ${r.reason}`)
  }
  const vague = rows.filter((r) => /hors sujet|ne correspond à aucune/i.test(r.reason) && r.score > 0)
  console.log(`\n${rows.length - failed.length}/${rows.length} dans la plage attendue`)
  const offTopic = rows.filter((r) => /hors sujet/i.test(r.reason) && /^(diagramme de clapeyron)$/i.test(r.text))
  console.log(`Motif « hors sujet » sur « diagramme de clapeyron » : ${offTopic.length}`)
  console.log(`Notes > 0 avec motif vague : ${vague.length}`)
  process.exit(failed.length ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(2)
})
