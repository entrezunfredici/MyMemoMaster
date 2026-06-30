'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('AuditLog', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      actorId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'User', key: 'userId' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      action: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      entityType: {
        type: Sequelize.STRING(30),
        allowNull: false
      },
      entityId: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    })

    await queryInterface.addIndex('AuditLog', ['actorId'], {
      name: 'idx_auditlog_actorid'
    })
    await queryInterface.addIndex('AuditLog', ['entityType', 'entityId'], {
      name: 'idx_auditlog_entity'
    })
    await queryInterface.addIndex('AuditLog', ['createdAt'], {
      name: 'idx_auditlog_createdat'
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('AuditLog')
  }
}
