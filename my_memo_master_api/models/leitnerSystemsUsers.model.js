const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
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
      tableName: "leitnerSystemsUsers",
      timestamps: false,
    }
  );
};
