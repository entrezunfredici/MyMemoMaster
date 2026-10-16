const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const Tag = instance.define(
    'Tag',
    {
      tagId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
      },
      color: {
        type: DataTypes.STRING(7),
        allowNull: false,
        defaultValue: '#6366F1'
      }
    },
    {
      tableName: 'Tag',
      timestamps: false
    }
  )

  Tag.associate = (models) => {
    Tag.belongsToMany(models.Diagramme, {
      through: 'MindMapTag',
      foreignKey: 'tagId',
      otherKey: 'idMindMap',
      as: 'mindMaps'
    })

    Tag.belongsToMany(models.LeitnerSystem, {
      through: 'LeitnerSystemTag',
      foreignKey: 'tagId',
      otherKey: 'idSystem',
      as: 'leitnerSystems'
    })

    Tag.belongsToMany(models.Test, {
      through: 'TestTag',
      foreignKey: 'tagId',
      otherKey: 'testId',
      as: 'tests'
    })
  }

  return Tag
}
