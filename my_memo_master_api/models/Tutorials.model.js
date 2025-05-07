const { DataTypes } = require("sequelize");

models.exports = (instance) => {
  return instance.define(
    "Tutorials",
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
      link: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      revision_tips: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      idSubject: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "Tutorials",
      timestamps: false,
    }
  );
};
