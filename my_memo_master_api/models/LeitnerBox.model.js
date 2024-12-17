const { DataTypes } = require("sequelize");

module.exports = (instance) => {
  return instance.define(
    "LeitnerBox",
    {
      idBox: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      level: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      intervall: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      color: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      idSystem: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "LeitnerBox",
      timestamps: false,
    }
  );
};
