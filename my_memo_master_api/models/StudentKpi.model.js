// models/StudentKpi.model.js
const { DataTypes } = require("sequelize");

module.exports = (instance) => {
  return instance.define(
    "StudentKpi",
    {
      studentKpiId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },
      leitnerCardId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      subjectId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "StudentKpi",
      timestamps: true,
      updatedAt: "updatedAt",
      createdAt: "createdAt",
    }
  );
};