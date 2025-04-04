const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const LeitnerSystemsUsers = sequelize.define(
    "LeitnerSystemsUsers",
    {
      idUser: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      idSystem: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      writeRight: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      shareRight: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      shareWithWriteRightRight: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      shareWithAllRights: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: "LeitnerSystemsUsers",
      timestamps: false,
    }
  );

  // Associations
  LeitnerSystemsUsers.associate = (models) => {
    LeitnerSystemsUsers.belongsTo(models.User, {
      foreignKey: "idUser",
      as: "user",
    });

    LeitnerSystemsUsers.belongsTo(models.LeitnerSystem, {
      foreignKey: "idSystem",
      as: "leitnerSystem",
    });
  };

  return LeitnerSystemsUsers;
};
