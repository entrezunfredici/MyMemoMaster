'use strict'

// C-06 — noyau gamification (voir diagrams/gamification_badges.md §8) :
// - UserActivityDay : un enregistrement par jour où l'utilisateur a réellement pratiqué
//   (base du calcul de série, de l'objectif quotidien et du calendrier d'activité) ;
// - UserBadge : obtention d'un badge, irréversible, une seule fois par utilisateur.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('UserActivityDay', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'User', key: 'userId' },
        onDelete: 'CASCADE'
      },
      date: { type: Sequelize.DATEONLY, allowNull: false }
    })
    await queryInterface.addIndex('UserActivityDay', ['userId', 'date'], {
      name: 'uq_useractivityday_user_date',
      unique: true
    })

    await queryInterface.createTable('UserBadge', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'User', key: 'userId' },
        onDelete: 'CASCADE'
      },
      badgeCode: { type: Sequelize.STRING(40), allowNull: false },
      earnedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      seenAt: { type: Sequelize.DATE, allowNull: true },
      context: { type: Sequelize.JSON, allowNull: true }
    })
    await queryInterface.addIndex('UserBadge', ['userId', 'badgeCode'], {
      name: 'uq_userbadge_user_code',
      unique: true
    })
    await queryInterface.addIndex('UserBadge', ['userId', 'seenAt'], { name: 'idx_userbadge_user_seen' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('UserBadge')
    await queryInterface.dropTable('UserActivityDay')
  }
}
