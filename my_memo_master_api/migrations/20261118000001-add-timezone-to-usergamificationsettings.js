'use strict'

// Fuseau IANA de l'utilisateur (ex. « Europe/Paris »), envoyé par le navigateur : le « jour d'activité »,
// l'objectif quotidien et le rappel de série se calculent dans ce fuseau et non dans celui du serveur.
// Nullable : sans valeur, le fuseau du serveur reste utilisé (comportement antérieur).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('UserGamificationSettings', 'timezone', { type: Sequelize.STRING(64), allowNull: true })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('UserGamificationSettings', 'timezone')
  }
}
