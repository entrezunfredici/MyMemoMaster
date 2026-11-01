'use strict'

// Statuts pour lesquels un signalement est « ouvert » (voir diagrams/moderation_rules.md §6).
const OPEN_STATUSES = ['pending', 'in_review', 'hidden']

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ContentReport', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      contentType: { type: Sequelize.STRING(30), allowNull: false },
      contentId: { type: Sequelize.INTEGER, allowNull: false },
      classGroupId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'ClassGroup', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      reporterId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'User', key: 'userId' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      authorId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'User', key: 'userId' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      reason: { type: Sequelize.STRING(30), allowNull: false },
      comment: { type: Sequelize.STRING(500), allowNull: true },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pending' },
      handledBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'User', key: 'userId' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      decisionNote: { type: Sequelize.STRING(500), allowNull: true },
      contentSnapshot: { type: Sequelize.JSON, allowNull: true },
      hiddenAt: { type: Sequelize.DATE, allowNull: true },
      purgeAt: { type: Sequelize.DATE, allowNull: true },
      resolvedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    })

    await queryInterface.addIndex('ContentReport', ['status', 'createdAt'], { name: 'idx_contentreport_status_created' })
    await queryInterface.addIndex('ContentReport', ['contentType', 'contentId'], { name: 'idx_contentreport_content' })
    await queryInterface.addIndex('ContentReport', ['reporterId'], { name: 'idx_contentreport_reporter' })
    await queryInterface.addIndex('ContentReport', ['status', 'purgeAt'], { name: 'idx_contentreport_purge' })
    // Un utilisateur ne peut avoir qu'un signalement ouvert par contenu (index partiel).
    await queryInterface.addIndex('ContentReport', ['reporterId', 'contentType', 'contentId'], {
      name: 'uniq_contentreport_open_per_reporter',
      unique: true,
      where: { status: OPEN_STATUSES }
    })

    for (const table of ['ClassGroupResource', 'ClassGroupSection']) {
      await queryInterface.addColumn(table, 'hiddenAt', { type: Sequelize.DATE, allowNull: true })
      await queryInterface.addColumn(table, 'hiddenBy', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'User', key: 'userId' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      })
    }
  },

  async down(queryInterface) {
    for (const table of ['ClassGroupResource', 'ClassGroupSection']) {
      await queryInterface.removeColumn(table, 'hiddenBy')
      await queryInterface.removeColumn(table, 'hiddenAt')
    }
    await queryInterface.dropTable('ContentReport')
  }
}
