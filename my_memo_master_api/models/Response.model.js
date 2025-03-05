const { DataTypes } = require("sequelize");

module.exports = (instance) => {
  return instance.define(
    "Response",
    {
      idResponse: {
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
      idQuestion: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "Response",
      timestamps: false,
    },
  );
};
