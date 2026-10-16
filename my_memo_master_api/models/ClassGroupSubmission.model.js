const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const ClassGroupSubmission = instance.define(
    'ClassGroupSubmission',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      sectionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'ClassGroupSection', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      classGroupId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'ClassGroup', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      studentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'User', key: 'userId' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
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
      submittedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: 'ClassGroupSubmission',
      timestamps: false,
      indexes: [
        { fields: ['sectionId'] },
        { fields: ['classGroupId'] },
        { fields: ['studentId'] },
        { unique: true, fields: ['sectionId', 'studentId'] }
      ]
    }
  )

  ClassGroupSubmission.associate = (models) => {
    ClassGroupSubmission.belongsTo(models.ClassGroupSection, { foreignKey: 'sectionId', as: 'section' })
    ClassGroupSubmission.belongsTo(models.ClassGroup, { foreignKey: 'classGroupId', as: 'classGroup' })
    ClassGroupSubmission.belongsTo(models.User, { foreignKey: 'studentId', as: 'student' })
  }

  return ClassGroupSubmission
}
