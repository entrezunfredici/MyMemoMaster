const { DataTypes } = require("sequelize");

module.exports = (instance) => {
  const UserOnboardingState = instance.define(
    "UserOnboardingState",
    {
      userId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        references: {
          model: "User",
          key: "userId",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      tourSeen: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      checklist: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      updatedAt: {
        type: DataTypes.DATE, //Pas de timestampz
        allowNull: false,
        defaultValue: DataTypes.NOW,
      }
    },
    {
      tableName: "UserOnboardingState",
      timestamps: false,
    }
  );

  UserOnboardingState.associate = (models) => {
    UserOnboardingState.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
    });
  };

  return UserOnboardingState;
};
