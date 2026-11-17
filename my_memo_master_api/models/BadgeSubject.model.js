const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const BadgeSubject = instance.define(
    'BadgeSubject',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      // Code stable du catalogue (helpers/badges/catalog.js) : le badge vit en code, pas en base
      badgeCode: { type: DataTypes.STRING(40), allowNull: false },
      subjectId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Subject', key: 'subjectId' },
        onDelete: 'CASCADE'
      }
    },
    {
      tableName: 'BadgeSubject',
      timestamps: false,
      indexes: [
        { unique: true, fields: ['badgeCode', 'subjectId'], name: 'uq_badgesubject_code_subject' },
        { fields: ['subjectId'], name: 'idx_badgesubject_subject' }
      ]
    }
  )

  BadgeSubject.associate = (models) => {
    BadgeSubject.belongsTo(models.Subject, { foreignKey: 'subjectId', as: 'subject' })
  }

  return BadgeSubject
}
