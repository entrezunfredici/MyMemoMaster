const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const BackupRun = instance.define(
    'BackupRun',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      trigger: {
        type: DataTypes.STRING(10),
        allowNull: false
        // 'auto' | 'manual'
      },
      status: {
        type: DataTypes.STRING(10),
        allowNull: false
        // 'running' | 'success' | 'failed'
      },
      slot: {
        type: DataTypes.STRING(30),
        allowNull: true,
        unique: true
        // Créneau d'une sauvegarde planifiée (ex. auto-2026-10-22) : l'unicité garantit qu'un seul pod la lance.
      },
      triggeredBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'User',
          key: 'userId'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      finishedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      durationMs: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      sizeBytes: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      location: {
        type: DataTypes.STRING(500),
        allowNull: true
        // Clé S3 ou chemin du fichier local du dump
      },
      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    },
    {
      tableName: 'BackupRun',
      timestamps: false,
      indexes: [{ fields: ['startedAt'] }]
    }
  )

  BackupRun.associate = (models) => {
    BackupRun.belongsTo(models.User, { foreignKey: 'triggeredBy', as: 'author' })
  }

  return BackupRun
}
