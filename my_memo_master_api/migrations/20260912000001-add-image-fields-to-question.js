'use strict'

// Ticket A (bibliotheque_ressources_ui / images sur les questions) : permet de rattacher une image
// ou un schema a une question, soit uploade manuellement par l'utilisateur, soit repris par l'IA
// depuis un PDF source (Ticket B, non couvert par cette migration).
// CHOIX : memes noms/types que ClassGroupResource (fileKey/mimeType/originalName/fileSize, voir
// migration 20260626000003-add-file-fields-to-classgroupresource.js), prefixes "image" car Question
// n'aura jamais qu'un seul fichier attache (pas de notion de "type" de ressource comme ClassGroupResource).
// RAISON : reutilise le pattern deja etabli plutot que d'en inventer un nouveau (DECISIONS.md, 2026-09-12).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Question', 'imageUrl', {
      type: Sequelize.STRING(500),
      allowNull: true
    })
    await queryInterface.addColumn('Question', 'imageKey', {
      type: Sequelize.STRING(500),
      allowNull: true
    })
    await queryInterface.addColumn('Question', 'imageMimeType', {
      type: Sequelize.STRING(100),
      allowNull: true
    })
    await queryInterface.addColumn('Question', 'imageOriginalName', {
      type: Sequelize.STRING(255),
      allowNull: true
    })
    await queryInterface.addColumn('Question', 'imageSize', {
      type: Sequelize.INTEGER,
      allowNull: true
    })
    // 'manual' (uploade par l'utilisateur) | 'ai' (rattachee automatiquement par la generation IA,
    // Ticket B) — null tant qu'aucune image n'est rattachee.
    await queryInterface.addColumn('Question', 'imageSource', {
      type: Sequelize.STRING(20),
      allowNull: true
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Question', 'imageUrl')
    await queryInterface.removeColumn('Question', 'imageKey')
    await queryInterface.removeColumn('Question', 'imageMimeType')
    await queryInterface.removeColumn('Question', 'imageOriginalName')
    await queryInterface.removeColumn('Question', 'imageSize')
    await queryInterface.removeColumn('Question', 'imageSource')
  }
}
