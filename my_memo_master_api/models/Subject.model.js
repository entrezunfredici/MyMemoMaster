const { DataTypes } = require("sequelize");

module.exports = (instance) => {
  return instance.define(
    "Subject",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      mindMapId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      leitnerSystemId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      testId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "subjects",
      timestamps: false,
    }
  );
};
