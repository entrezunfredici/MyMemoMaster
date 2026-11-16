const { DataTypes } = require('sequelize')

// Lien entre un compte MyMemoMaster et une identité chez un fournisseur OAuth (google, github, microsoft).
// Un utilisateur peut avoir plusieurs identités ; une identité n'appartient qu'à un seul utilisateur.
module.exports = (instance) => {
  const UserOAuthAccount = instance.define(
    'UserOAuthAccount',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'User', key: 'userId' },
        onDelete: 'CASCADE'
      },
      provider: {
        type: DataTypes.STRING(20),
        allowNull: false
      },
      providerUserId: {
        type: DataTypes.STRING(191),
        allowNull: false
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: 'UserOAuthAccount',
      timestamps: false,
      indexes: [
        { unique: true, fields: ['provider', 'providerUserId'], name: 'uq_useroauthaccount_provider_id' },
        { fields: ['userId'] }
      ]
    }
  )

  UserOAuthAccount.associate = (models) => {
    UserOAuthAccount.belongsTo(models.User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' })
  }

  return UserOAuthAccount
}
