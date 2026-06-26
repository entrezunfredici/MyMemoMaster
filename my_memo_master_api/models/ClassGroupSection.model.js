const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const ClassGroupSection = instance.define(
    'ClassGroupSection',
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
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'section'
        // Valeurs : 'section' | 'rendu'
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      dueDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: 'ClassGroupSection',
      timestamps: false,
      indexes: [{ fields: ['classGroupId'] }, { fields: ['createdBy'] }]
    }
  )

  ClassGroupSection.associate = (models) => {
    ClassGroupSection.belongsTo(models.ClassGroup, { foreignKey: 'classGroupId', as: 'classGroup' })
    ClassGroupSection.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' })
    ClassGroupSection.hasMany(models.ClassGroupSubmission, { foreignKey: 'sectionId', as: 'submissions' })
  }

  return ClassGroupSection
}
