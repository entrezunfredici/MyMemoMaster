const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const ClassGroupResource = instance.define(
    'ClassGroupResource',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      classGroupId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'ClassGroup', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'User', key: 'userId' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      title: {
        type: DataTypes.STRING(150),
        allowNull: false
      },
      type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'autre'
        // Valeurs : 'cours' | 'carte_mentale' | 'sujet' | 'autre'
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      url: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      fileKey: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      mimeType: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      originalName: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      fileSize: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: 'ClassGroupResource',
      timestamps: false,
      indexes: [{ fields: ['classGroupId'] }, { fields: ['createdBy'] }]
    }
  )

  ClassGroupResource.associate = (models) => {
    ClassGroupResource.belongsTo(models.ClassGroup, { foreignKey: 'classGroupId', as: 'classGroup' })
    ClassGroupResource.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' })
  }

  return ClassGroupResource
}
