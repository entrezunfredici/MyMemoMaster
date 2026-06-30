const { DataTypes } = require('sequelize')

module.exports = (instance) => {
  const User = instance.define(
    'User',
    {
      userId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      roleId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 2,
        references: {
          model: 'Role',
          key: 'roleId'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false
      },
      validEmailCode: {
        type: DataTypes.STRING,
        allowNull: true
      },
      validEmailCodeExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      resetPasswordCode: {
        type: DataTypes.STRING(64),
        allowNull: true
      },
      resetPasswordCodeExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      hasValidatedEmail: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      lastLogin: {
        type: DataTypes.DATE,
        allowNull: true
      },
      refreshToken: {
        type: DataTypes.STRING(128),
        allowNull: true
      },
      refreshTokenExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: 'User',
      updatedAt: 'updatedAt',
      createdAt: 'createdAt',
      timestamps: false,
      indexes: [{ fields: ['roleId'] }]
    }
  )

  // Associations
  User.associate = (models) => {
    User.hasMany(models.LeitnerSystem, {
      foreignKey: 'idUser',
      as: 'leitnerSystems'
    })

    User.hasMany(models.LeitnerSystemsUsers, {
      foreignKey: 'idUser',
      as: 'leitnerSystemsUsers'
    })

    User.hasOne(models.UserOnboardingState, {
      foreignKey: 'userId',
      as: 'onboardingState'
    })

    User.hasMany(models.ClassGroup, {
      foreignKey: 'createdBy',
      as: 'classGroups'
    })

    User.hasMany(models.ClassGroupUsers, {
      foreignKey: 'userId',
      as: 'classGroupMemberships'
    })

    User.hasMany(models.CalendarEvent, {
      foreignKey: 'createdBy',
      as: 'calendarEvents'
    })

    User.hasMany(models.Deadline, {
      foreignKey: 'createdBy',
      as: 'deadlines'
    })

    User.hasMany(models.RevisionSession, {
      foreignKey: 'userId',
      as: 'revisionSessions'
    })

    User.hasMany(models.Reminder, {
      foreignKey: 'userId',
      as: 'reminders'
    })

    User.hasOne(models.Etablissement, {
      foreignKey: 'adminId',
      as: 'etablissement'
    })

    User.hasMany(models.AuditLog, {
      foreignKey: 'actorId',
      as: 'auditLogs'
    })
  }

  return User
}
