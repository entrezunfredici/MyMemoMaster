const { DataTypes } = require("sequelize");

module.exports = (instance) => {
  const Fields = instance.define(
    "Fields",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      fieldletter: {
        type: DataTypes.STRING(5),
        allowNull: false,
      },
      data: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      idUnit: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "units",
          key: "idUnit",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      idType: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "fieldsType",
          key: "idType",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
    },
    { tableName: "Fields", timestamps: false }
  );

  //Associations
  Fields.associate = (models) => {
    Fields.belongsTo(models.fieldsType, {
      foreignKey: "idType",
      as: "fieldType",
    });
    Fields.belongsTo(models.units, {
      foreignKey: "idUnit",
      as: "units",
    });
  };

  return Fields;
};
