const { DataTypes } = require("sequelize");
module.exports = (instance) => {
    const fieldsType = instance.define(
      "fieldsType",
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
          type: DataTypes.BOOLEAN,
          allowNull: false,
        },
      },
      {
        tableName: "fieldsType",
        timestamps: false,
      }
    );
  
    // Associations
    fieldsType.associate = (models) => {
      fieldsType.hasMany(models.Fields, {
        foreignKey: "idType",
        as: "fields",
      });
    };
  
    return fieldsType;
  };
  