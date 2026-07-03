'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect()

    if (dialect === 'sqlite') {
      // SQLite ne supporte pas ALTER COLUMN → on recrée la table
      await queryInterface.createTable('Invitation_new', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        classGroupId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'ClassGroup', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        etablissementId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'Etablissement', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        targetUserId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'User', key: 'userId' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        targetEmail: { type: Sequelize.STRING(255), allowNull: true },
        invitedByUserId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'User', key: 'userId' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        role: { type: Sequelize.STRING(25), allowNull: false, defaultValue: 'student' },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pending' },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      })

      await queryInterface.sequelize.query(
        `INSERT INTO "Invitation_new"
         (id, classGroupId, etablissementId, targetUserId, targetEmail, invitedByUserId, role, status, createdAt)
         SELECT id, classGroupId, NULL, targetUserId, targetEmail, invitedByUserId, role, status, createdAt
         FROM "Invitation"`
      )

      await queryInterface.dropTable('Invitation')
      await queryInterface.renameTable('Invitation_new', 'Invitation')

      await queryInterface.addIndex('Invitation', ['classGroupId'])
      await queryInterface.addIndex('Invitation', ['targetUserId'])
      await queryInterface.addIndex('Invitation', ['targetUserId', 'status'])
    } else {
      // PostgreSQL
      await queryInterface.sequelize.query(
        'ALTER TABLE "Invitation" ALTER COLUMN "classGroupId" DROP NOT NULL'
      )
      await queryInterface.addColumn('Invitation', 'etablissementId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Etablissement', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      })
      await queryInterface.sequelize.query(
        "ALTER TABLE \"Invitation\" ALTER COLUMN \"role\" TYPE VARCHAR(25)"
      )
    }
  },

  async down(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect()

    if (dialect === 'sqlite') {
      await queryInterface.createTable('Invitation_old', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        classGroupId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'ClassGroup', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        targetUserId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'User', key: 'userId' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        targetEmail: { type: Sequelize.STRING(255), allowNull: true },
        invitedByUserId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'User', key: 'userId' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        role: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'student' },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pending' },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      })
      await queryInterface.sequelize.query(
        `INSERT INTO "Invitation_old"
         (id, classGroupId, targetUserId, targetEmail, invitedByUserId, role, status, createdAt)
         SELECT id, classGroupId, targetUserId, targetEmail, invitedByUserId, role, status, createdAt
         FROM "Invitation" WHERE classGroupId IS NOT NULL`
      )
      await queryInterface.dropTable('Invitation')
      await queryInterface.renameTable('Invitation_old', 'Invitation')
    } else {
      await queryInterface.removeColumn('Invitation', 'etablissementId')
      await queryInterface.sequelize.query(
        'ALTER TABLE "Invitation" ALTER COLUMN "classGroupId" SET NOT NULL'
      )
      await queryInterface.sequelize.query(
        "ALTER TABLE \"Invitation\" ALTER COLUMN \"role\" TYPE VARCHAR(20)"
      )
    }
  }
}
