const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const LeitnerCard = instance.define(
    'LeitnerCard',
    {
      idCard: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      fifo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      dateTimeFifo: {
        type: DataTypes.DATE,
        allowNull: true
      },
      idQuestion: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      // Nœud de la carte mentale liée au système (id interne au JSON MindMap.mindMapJson)
      mindMapNodeId: {
        type: DataTypes.STRING(64),
        allowNull: true,
        defaultValue: null
      },
      idBox: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'LeitnerBox',
          key: 'idBox'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      next_review_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      last_review_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      review_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      correct_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      incorrect_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
      }
    },
    {
      tableName: 'LeitnerCard',
      timestamps: false,
      indexes: [{ fields: ['idQuestion'] }, { fields: ['idBox'] }, { fields: ['next_review_at'] }]
    }
  )

  LeitnerCard.associate = (models) => {
    LeitnerCard.belongsTo(models.LeitnerBox, {
      foreignKey: 'idBox',
      as: 'leitnerBox'
    })

    LeitnerCard.belongsTo(models.Question, {
      foreignKey: 'idQuestion',
      as: 'question'
    })

    LeitnerCard.belongsToMany(instance.models.LeitnerSystem, {
      through: 'cardSystems',
      foreignKey: 'idCard',
      otherKey: 'idSystem',
      as: 'leitnerSystems'
    })
  }

  return LeitnerCard
}
