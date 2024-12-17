const { DataTypes } = require("sequelize");
const { instance } = require("./index");

const Response = instance.define(
  "Response",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    content: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    correction: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    responseType: {
      type: DataTypes.ARRAY(DataTypes.STRING), // Tableau de chaînes de caractères
      allowNull: false,
    },
  },
  {
    tableName: "responses",
    timestamps: false,
  }
);

module.exports = Response;
