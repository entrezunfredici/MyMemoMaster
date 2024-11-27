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
  },
  {
    tableName: "subjects",
    timestamps: false,
  }
);

module.exports = Subject;
