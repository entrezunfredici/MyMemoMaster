const { DataTypes } = require("sequelize");
const sequelizen = require("../db.config");

const fieldsType = sequelizen.define("fieldsType", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  separation: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  allowFloat: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  allowCharacters: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  allowUnit: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  allowFloat: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW, // Par défaut, la date actuelle
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },

},{
    tableName : 'fieldType',
    timestamps : true,
});

module.exports = fieldsType;
