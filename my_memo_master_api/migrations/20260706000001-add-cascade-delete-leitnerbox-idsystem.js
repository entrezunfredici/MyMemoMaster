'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect()

    if (dialect === 'sqlite') {
      // SQLite ne supporte pas la modification d'une contrainte FK existante → on recrée la table
      await queryInterface.createTable('LeitnerBox_new', {
        idBox: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
        level: { type: Sequelize.INTEGER, allowNull: false },
        intervall: { type: Sequelize.INTEGER, allowNull: false },
        color: { type: Sequelize.BIGINT, allowNull: false },
        idSystem: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'LeitnerSystem', key: 'idSystem' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        }
      })

      await queryInterface.sequelize.query(
        `INSERT INTO "LeitnerBox_new" (idBox, level, intervall, color, idSystem)
         SELECT idBox, level, intervall, color, idSystem FROM "LeitnerBox"`
      )

      await queryInterface.dropTable('LeitnerBox')
      await queryInterface.renameTable('LeitnerBox_new', 'LeitnerBox')

      await queryInterface.addIndex('LeitnerBox', ['idSystem'])
    } else {
      // PostgreSQL : la contrainte a été créée sans nom explicite (CREATE TABLE), on la retrouve dynamiquement
      await queryInterface.sequelize.query(`
        DO $$
        DECLARE
          fk_name text;
        BEGIN
          SELECT tc.constraint_name INTO fk_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_name = 'LeitnerBox'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'idSystem';

          IF fk_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE "LeitnerBox" DROP CONSTRAINT %I', fk_name);
          END IF;

          ALTER TABLE "LeitnerBox" ADD CONSTRAINT "LeitnerBox_idSystem_fkey"
            FOREIGN KEY ("idSystem") REFERENCES "LeitnerSystem" ("idSystem")
            ON DELETE CASCADE ON UPDATE CASCADE;
        END $$;
      `)
    }
  },

  async down(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect()

    if (dialect === 'sqlite') {
      await queryInterface.createTable('LeitnerBox_old', {
        idBox: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
        level: { type: Sequelize.INTEGER, allowNull: false },
        intervall: { type: Sequelize.INTEGER, allowNull: false },
        color: { type: Sequelize.BIGINT, allowNull: false },
        idSystem: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'LeitnerSystem', key: 'idSystem' }
        }
      })

      await queryInterface.sequelize.query(
        `INSERT INTO "LeitnerBox_old" (idBox, level, intervall, color, idSystem)
         SELECT idBox, level, intervall, color, idSystem FROM "LeitnerBox"`
      )

      await queryInterface.dropTable('LeitnerBox')
      await queryInterface.renameTable('LeitnerBox_old', 'LeitnerBox')

      await queryInterface.addIndex('LeitnerBox', ['idSystem'])
    } else {
      await queryInterface.sequelize.query(`
        ALTER TABLE "LeitnerBox" DROP CONSTRAINT IF EXISTS "LeitnerBox_idSystem_fkey";
        ALTER TABLE "LeitnerBox" ADD CONSTRAINT "LeitnerBox_idSystem_fkey"
          FOREIGN KEY ("idSystem") REFERENCES "LeitnerSystem" ("idSystem");
      `)
    }
  }
}
