const { DataTypes } = require("sequelize");

module.exports = (instance) => {
  const Response =  instance.define(
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

  Response.associate = (models) => {

    Response.belongsTo(models.Question, {
      foreignKey: "idQuestion",
      as: "question",
    });
  };

  return Response;

};
