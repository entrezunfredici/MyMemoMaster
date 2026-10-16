'use strict'

// FIX : MindMap.userId référençait User sans onDelete explicite → PostgreSQL applique NO ACTION,
// ce qui bloquait DELETE /users/:id (500) dès qu'un utilisateur avait au moins une carte mentale
// enregistrée. Comportement corrigé aligné sur LeitnerSystem.idUser (contenu réel de l'utilisateur
// → SET NULL, orphelin mais conservé — voir DECISIONS.md 2026-09-02 C-01.07 et le bug analogue déjà
// corrigé sur LeitnerBox.idSystem, migration 20260706000001).
module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect()

    if (dialect === 'sqlite') {
      // SQLite ne supporte pas la modification d'une contrainte FK existante → on recrée la table
      await queryInterface.createTable('MindMap_new', {
        idMindMap: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
        mmName: { type: Sequelize.STRING(50), allowNull: false },
        mindMapJson: { type: Sequelize.JSON, allowNull: false },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'User', key: 'userId' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        subjectId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'Subject', key: 'subjectId' }
        }
      })

      await queryInterface.sequelize.query(
        `INSERT INTO "MindMap_new" (idMindMap, mmName, mindMapJson, userId, subjectId)
         SELECT idMindMap, mmName, mindMapJson, userId, subjectId FROM "MindMap"`
      )

      await queryInterface.dropTable('MindMap')
      await queryInterface.renameTable('MindMap_new', 'MindMap')

      await queryInterface.addIndex('MindMap', ['userId'])
      await queryInterface.addIndex('MindMap', ['subjectId'])
    } else {
      // PostgreSQL : la contrainte a été créée sans nom explicite (CREATE TABLE), on la retrouve dynamiquement
      await queryInterface.sequelize.query(`
        ALTER TABLE "MindMap" ALTER COLUMN "userId" DROP NOT NULL;

        DO $$
        DECLARE
          fk_name text;
        BEGIN
          SELECT tc.constraint_name INTO fk_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_name = 'MindMap'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'userId';

          IF fk_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE "MindMap" DROP CONSTRAINT %I', fk_name);
          END IF;

          ALTER TABLE "MindMap" ADD CONSTRAINT "MindMap_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User" ("userId")
            ON DELETE SET NULL ON UPDATE CASCADE;
        END $$;
      `)
    }
  },

  async down(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect()

    if (dialect === 'sqlite') {
      await queryInterface.createTable('MindMap_old', {
        idMindMap: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
        mmName: { type: Sequelize.STRING(50), allowNull: false },
        mindMapJson: { type: Sequelize.JSON, allowNull: false },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'User', key: 'userId' }
        },
        subjectId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'Subject', key: 'subjectId' }
        }
      })

      await queryInterface.sequelize.query(
        `INSERT INTO "MindMap_old" (idMindMap, mmName, mindMapJson, userId, subjectId)
         SELECT idMindMap, mmName, mindMapJson, userId, subjectId FROM "MindMap"`
      )

      await queryInterface.dropTable('MindMap')
      await queryInterface.renameTable('MindMap_old', 'MindMap')

      await queryInterface.addIndex('MindMap', ['userId'])
      await queryInterface.addIndex('MindMap', ['subjectId'])
    } else {
      await queryInterface.sequelize.query(`
        ALTER TABLE "MindMap" DROP CONSTRAINT IF EXISTS "MindMap_userId_fkey";
        ALTER TABLE "MindMap" ALTER COLUMN "userId" SET NOT NULL;
        ALTER TABLE "MindMap" ADD CONSTRAINT "MindMap_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "User" ("userId");
      `)
    }
  }
}
