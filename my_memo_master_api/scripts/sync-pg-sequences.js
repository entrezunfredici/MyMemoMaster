/**
 * Resynchronise les séquences PostgreSQL après les seeders CLI.
 *
 * Les seeders insèrent des PK explicites (Role : roleId 1–5) via bulkInsert,
 * ce qui ne fait pas avancer la séquence <table>_<pk>_seq : le premier
 * Role.create() suivant tenterait de réutiliser un ID déjà pris
 * (SequelizeUniqueConstraintError). Voir DECISIONS.md, entrée 2026-06-14.
 *
 * Usage :
 *   node scripts/sync-pg-sequences.js
 *
 * No-op silencieux si le dialecte n'est pas PostgreSQL (dev SQLite).
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })

const { instance } = require('../models')

// Tables dont un seeder impose des PK explicites — étendre si un nouveau
// seeder insère des IDs en dur.
const SEQUENCES = [{ table: 'Role', pk: 'roleId' }]

async function main() {
  if (instance.getDialect() !== 'postgres') {
    console.log('[sync-pg-sequences] Dialecte non-PostgreSQL — rien à faire.')
    return
  }
  for (const { table, pk } of SEQUENCES) {
    // setval(MAX(pk)) : idempotent, sans effet si la séquence est déjà au-delà
    await instance.query(
      `SELECT setval(pg_get_serial_sequence('"${table}"', '${pk}'), COALESCE((SELECT MAX("${pk}") FROM "${table}"), 1))`
    )
    console.log(`[sync-pg-sequences] Séquence de "${table}"."${pk}" resynchronisée.`)
  }
}

main()
  .then(() => instance.close())
  .catch((error) => {
    console.error(`[sync-pg-sequences] Échec : ${error?.message || error}`)
    process.exit(1)
  })
