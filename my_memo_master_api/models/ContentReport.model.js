const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const ContentReport = instance.define(
    'ContentReport',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      contentType: {
        type: DataTypes.STRING(30),
        allowNull: false
        // 'resource' | 'section'
      },
      // Pas de clé étrangère : pointe vers ClassGroupResource ou ClassGroupSection selon contentType.
      contentId: { type: DataTypes.INTEGER, allowNull: false },
      classGroupId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'ClassGroup', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      reporterId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'User', key: 'userId' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      authorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'User', key: 'userId' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      reason: {
        type: DataTypes.STRING(30),
        allowNull: false
        // illegal | harassment | copyright | spam | personal_data | other
      },
      comment: { type: DataTypes.STRING(500), allowNull: true },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pending'
        // pending | in_review | hidden | dismissed | actioned
      },
      handledBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'User', key: 'userId' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      decisionNote: { type: DataTypes.STRING(500), allowNull: true },
      contentSnapshot: { type: DataTypes.JSON, allowNull: true },
      hiddenAt: { type: DataTypes.DATE, allowNull: true },
      purgeAt: { type: DataTypes.DATE, allowNull: true },
      resolvedAt: { type: DataTypes.DATE, allowNull: true }
    },
    {
      tableName: 'ContentReport',
      timestamps: true,
      // L'unicité « un signalement ouvert par utilisateur et par contenu » est un index partiel créé
      // par la migration ; elle est aussi contrôlée en service (bases dev créées par sync).
      indexes: [
        { fields: ['status', 'createdAt'] },
        { fields: ['contentType', 'contentId'] },
        { fields: ['reporterId'] },
        { fields: ['status', 'purgeAt'] }
      ]
    }
  )

  ContentReport.associate = (models) => {
    ContentReport.belongsTo(models.User, { foreignKey: 'reporterId', as: 'reporter' })
    ContentReport.belongsTo(models.User, { foreignKey: 'authorId', as: 'author' })
    ContentReport.belongsTo(models.User, { foreignKey: 'handledBy', as: 'handler' })
    ContentReport.belongsTo(models.ClassGroup, { foreignKey: 'classGroupId', as: 'classGroup' })
  }

  return ContentReport
}
