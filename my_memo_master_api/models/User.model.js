const { DataTypes } = require("sequelize");

module.exports = (instance) => {
  const User = instance.define(
    "User",
    {
      userId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      roleId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "Role",
          key: "roleId",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      validEmailCode: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      resetPasswordCode: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      hasValidatedEmail: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      lastLogin: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "User",
      updatedAt: "updatedAt",
      createdAt: "createdAt",
      timestamps: false,
    }
  );

  // Associations
  User.associate = (models) => {
    User.hasMany(models.LeitnerSystem, {
      foreignKey: "idUser",
      as: "leitnerSystems",
    });

    User.hasMany(models.LeitnerSystemsUsers, {
      foreignKey: "idUser",
      as: "leitnerSystemsUsers",
    });

    User.hasOne(models.UserOnboardingState, {
      foreignKey: "userId",
      as: "onboardingState",
    });
  };

  return User;
};
