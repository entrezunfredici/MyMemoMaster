const { DataTypes } = require('sequelize')

// CHOIX: modèle explicite (au lieu de through: 'testQuestions' en simple chaîne)
// RAISON: sans modèle enregistré, Sequelize crée implicitement une table de jointure
// avec timestamps: true par défaut (aucun define.timestamps global dans dbms.config.js).
// La table réelle (migration 20260226152800-create-testquestions-table.js) n'a pas
// createdAt/updatedAt → tout INSERT généré par addTest()/setQuestions() plantait en
// prod (Postgres) avec "column createdAt does not exist". Pattern aligné sur
// TestClassGroup.model.js, qui suit déjà cette convention.
module.exports = (instance) => {
  const TestQuestion = instance.define(
    'testQuestions',
    {
      idTest: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'Test', key: 'testId' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      idQuestion: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'Question', key: 'idQuestion' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    },
    {
      tableName: 'testQuestions',
      timestamps: false
    }
  )

  return TestQuestion
}
