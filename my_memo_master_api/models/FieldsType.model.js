const { DataTypes } = require("sequelize");
module.exports = (instance) => {
    const FieldsType = instance.define(
      "FieldsType",
      {
        idType: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(50),
          allowNull: false,
        },
        allowUnit: {
          type: DataTypes.BOOLEAN
        },
      },
      {
        tableName: "FieldsType",
        timestamps: false,
      }
    );
  
    // Associations
    FieldsType.associate = (models) => {
      FieldsType.hasMany(models.Fields, {
        foreignKey: "idType",
        as: "fields",
      });
    };
  
    return FieldsType;
  };
