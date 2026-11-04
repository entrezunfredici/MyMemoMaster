/**
 * Rattrapage des badges (C-06) : reconstruit les jours d'activité depuis l'historique réel
 * (exercices, sessions Leitner, cartes mentales) puis attribue les badges déjà mérités,
 * marqués « vus » pour ne pas déclencher une rafale d'animations au déploiement.
 * Idempotent : rejouable sans doublon.
 *
 * Usage :
 *   node scripts/backfill-badges.js            # tous les utilisateurs
 *   node scripts/backfill-badges.js 42         # un seul utilisateur
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })

const { User, instance } = require('../models')
const badgeService = require('../services/Badge.service')

async function main() {
  const onlyId = process.argv[2] ? Number(process.argv[2]) : null
  const users = await User.findAll({ where: onlyId ? { userId: onlyId } : {}, attributes: ['userId'], raw: true })
  let awardedTotal = 0
  for (const { userId } of users) {
    const { activityDaysAdded, awarded } = await badgeService.backfill(userId)
    awardedTotal += awarded.length
    console.log(`[backfill-badges] user ${userId} : ${activityDaysAdded} jour(s) d'activité, ${awarded.length} badge(s) (${awarded.join(', ')})`)
  }
  console.log(`[backfill-badges] ${users.length} utilisateur(s), ${awardedTotal} badge(s) attribué(s).`)
}

main()
  .catch((err) => {
    console.error('[backfill-badges] Erreur :', err?.message || err)
    process.exitCode = 1
  })
  .finally(() => instance.close())
