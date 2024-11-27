const { DataTypes } = require("sequelize");
const { instance } = require("./index");

const Subject = instance.define(
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

module.exports = Subject;
