'use strict'

// Suite du fix 20260706000001 : la cascade LeitnerSystem → LeitnerBox s'arrêtait
// au niveau des cartes (FK LeitnerCard.idBox en NO ACTION), ce qui provoquait un 500
// à la suppression d'un système contenant des cartes.
module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect()

    if (dialect === 'sqlite') {
      // SQLite ne supporte pas la modification d'une contrainte FK existante → on recrée la table.
      // FK désactivées le temps du rebuild pour que le DROP TABLE ne cascade pas sur cardSystems.
      await queryInterface.sequelize.query('PRAGMA foreign_keys = OFF;')
      try {
        await queryInterface.createTable('LeitnerCard_new', {
          idCard: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
          fifo: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: true },
          dateTimeFifo: { type: Sequelize.DATE, allowNull: true },
          idQuestion: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'Question', key: 'idQuestion' }
          },
          idBox: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'LeitnerBox', key: 'idBox' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
          },
          next_review_at: { type: Sequelize.DATE, allowNull: true },
          last_review_at: { type: Sequelize.DATE, allowNull: true },
          review_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
          correct_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
          incorrect_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }
        })

        await queryInterface.sequelize.query(
          `INSERT INTO "LeitnerCard_new" (idCard, fifo, dateTimeFifo, idQuestion, idBox,
             next_review_at, last_review_at, review_count, correct_count, incorrect_count)
           SELECT idCard, fifo, dateTimeFifo, idQuestion, idBox,
             next_review_at, last_review_at, review_count, correct_count, incorrect_count
           FROM "LeitnerCard"`
        )

        await queryInterface.dropTable('LeitnerCard')
        await queryInterface.renameTable('LeitnerCard_new', 'LeitnerCard')

        await queryInterface.addIndex('LeitnerCard', ['idQuestion'])
        await queryInterface.addIndex('LeitnerCard', ['idBox'])
        await queryInterface.addIndex('LeitnerCard', ['next_review_at'])
      } finally {
        await queryInterface.sequelize.query('PRAGMA foreign_keys = ON;')
      }
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
          WHERE tc.table_name = 'LeitnerCard'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'idBox';

          IF fk_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE "LeitnerCard" DROP CONSTRAINT %I', fk_name);
          END IF;

          ALTER TABLE "LeitnerCard" ADD CONSTRAINT "LeitnerCard_idBox_fkey"
            FOREIGN KEY ("idBox") REFERENCES "LeitnerBox" ("idBox")
            ON DELETE CASCADE ON UPDATE CASCADE;
        END $$;
      `)
    }
  },

  async down(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect()

    if (dialect === 'sqlite') {
      await queryInterface.sequelize.query('PRAGMA foreign_keys = OFF;')
      try {
        await queryInterface.createTable('LeitnerCard_old', {
          idCard: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
          fifo: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: true },
          dateTimeFifo: { type: Sequelize.DATE, allowNull: true },
          idQuestion: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'Question', key: 'idQuestion' }
          },
          idBox: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'LeitnerBox', key: 'idBox' }
          },
          next_review_at: { type: Sequelize.DATE, allowNull: true },
          last_review_at: { type: Sequelize.DATE, allowNull: true },
          review_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
          correct_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
          incorrect_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }
        })

        await queryInterface.sequelize.query(
          `INSERT INTO "LeitnerCard_old" (idCard, fifo, dateTimeFifo, idQuestion, idBox,
             next_review_at, last_review_at, review_count, correct_count, incorrect_count)
           SELECT idCard, fifo, dateTimeFifo, idQuestion, idBox,
             next_review_at, last_review_at, review_count, correct_count, incorrect_count
           FROM "LeitnerCard"`
        )

        await queryInterface.dropTable('LeitnerCard')
        await queryInterface.renameTable('LeitnerCard_old', 'LeitnerCard')

        await queryInterface.addIndex('LeitnerCard', ['idQuestion'])
        await queryInterface.addIndex('LeitnerCard', ['idBox'])
        await queryInterface.addIndex('LeitnerCard', ['next_review_at'])
      } finally {
        await queryInterface.sequelize.query('PRAGMA foreign_keys = ON;')
      }
    } else {
      await queryInterface.sequelize.query(`
        ALTER TABLE "LeitnerCard" DROP CONSTRAINT IF EXISTS "LeitnerCard_idBox_fkey";
        ALTER TABLE "LeitnerCard" ADD CONSTRAINT "LeitnerCard_idBox_fkey"
          FOREIGN KEY ("idBox") REFERENCES "LeitnerBox" ("idBox");
      `)
    }
  }
}
