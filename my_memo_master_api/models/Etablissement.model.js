const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const Etablissement = instance.define(
    'Etablissement',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      code: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true
      },
      adminId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'User',
          key: 'userId'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: 'Etablissement',
      timestamps: false,
      indexes: [
        { unique: true, fields: ['code'] },
        { fields: ['adminId'] }
      ]
    }
  )

  Etablissement.associate = (models) => {
    Etablissement.belongsTo(models.User, { foreignKey: 'adminId', as: 'admin' })
  }

  return Etablissement
}
