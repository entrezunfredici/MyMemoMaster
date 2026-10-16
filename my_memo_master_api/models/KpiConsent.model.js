const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const KpiConsent = instance.define(
    'KpiConsent',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      studentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'User', key: 'userId' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      teacherId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'User', key: 'userId' },
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
      subjectId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'Subject', key: 'subjectId' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      grantedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: 'KpiConsent',
      timestamps: false,
      indexes: [
        { unique: true, fields: ['studentId', 'teacherId', 'classGroupId', 'subjectId'], name: 'kpiconsent_unique_consent_unit' },
        { fields: ['teacherId'] },
        { fields: ['classGroupId'] },
        { fields: ['subjectId'] }
      ]
    }
  )

  KpiConsent.associate = (models) => {
    KpiConsent.belongsTo(models.User, { foreignKey: 'studentId', as: 'student' })
    KpiConsent.belongsTo(models.User, { foreignKey: 'teacherId', as: 'teacher' })
    KpiConsent.belongsTo(models.ClassGroup, { foreignKey: 'classGroupId', as: 'classGroup' })
    KpiConsent.belongsTo(models.Subject, { foreignKey: 'subjectId', as: 'subject' })
  }

  return KpiConsent
}
