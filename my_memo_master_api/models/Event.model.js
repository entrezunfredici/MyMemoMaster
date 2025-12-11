const { DataTypes } = require("sequelize");

module.exports = (instance) => {
  const Event = instance.define(
    "Event",
    {
      eventId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "User",
          key: "userId",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      startAt: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      endAt: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM("course", "exam", "meeting", "other"),
        defaultValue: "other",
        allowNull: false,
      },
      location: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      groupId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        //Ajouter une table Groupe pour le connecter à cette table
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "Event",
      timestamps: false,
      updatedAt: "updatedAt",
      createdAt: "createdAt",
    },
  );

  return Event;
};