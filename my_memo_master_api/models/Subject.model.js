const { DataTypes } = require("sequelize");

module.exports = (instance) => {
  return instance.define(
    "Subject",
    {
      idSubject: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
    },
    {
      tableName: "subjects",
      updatedAt: "updatedAt",
      createdAt: "createdAt",
      timestamps: false,
    }
  );
};
