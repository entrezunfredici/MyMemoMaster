'use strict'

// Les boîtes créées jusqu'ici portaient des couleurs placeholder (123456, 654321, 111111,
// 222222, 333333 — lues comme 0xRRGGBB elles donnaient des teintes sombres quasi identiques).
// On les remplace par la palette par défaut rouge → vert, uniquement quand la valeur est
// encore exactement le placeholder du niveau (une couleur choisie par l'utilisateur est préservée).
const LEGACY_TO_PALETTE = [
  { level: 1, legacy: 123456, color: 0xe74c3c },
  { level: 2, legacy: 654321, color: 0xf39c12 },
  { level: 3, legacy: 111111, color: 0xf1c40f },
  { level: 4, legacy: 222222, color: 0x2ecc71 },
  { level: 5, legacy: 333333, color: 0x27ae60 }
]

module.exports = {
  async up(queryInterface) {
    for (const { level, legacy, color } of LEGACY_TO_PALETTE) {
      await queryInterface.sequelize.query(
        'UPDATE "LeitnerBox" SET "color" = :color WHERE "level" = :level AND "color" = :legacy',
        { replacements: { color, level, legacy } }
      )
    }
  },

  async down(queryInterface) {
    for (const { level, legacy, color } of LEGACY_TO_PALETTE) {
      await queryInterface.sequelize.query(
        'UPDATE "LeitnerBox" SET "color" = :legacy WHERE "level" = :level AND "color" = :color',
        { replacements: { color, level, legacy } }
      )
    }
  }
}
