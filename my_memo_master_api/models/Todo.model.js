const { DataTypes } = require("sequelize");

/**
 * Modèle Todo
 * - Clef primaire: id (UUID)
 * - Clef étrangère: user_id -> User.id
 * - Status: enum (pending, in_progress, done)
 * - Indexes sur user_id, status, deadline_utc
 * - Timestamps gérés manuellement
 */
module.exports = (instance) => {
  const Todo = instance.define(
    "Todo",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "User",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: {
          notEmpty: { msg: "Le titre ne peut pas être vide" },
          len: { args: [1, 200], msg: "Le titre est trop long (max 200 caractères)" },
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("pending", "in_progress", "done"),
        allowNull: false,
        defaultValue: "pending",
      },
      deadline_utc: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "Todo",
      timestamps: false,
      indexes: [
        { fields: ["user_id"] },
        { fields: ["status"] },
        { fields: ["deadline_utc"] },
      ],
    }
  );

  // Association: un todo appartient à un User
  Todo.associate = (models) => {
    if (models && models.User) {
      Todo.belongsTo(models.User, {
        foreignKey: "user_id",
        targetKey: "id",
        as: "user",
      });
    }
  };

  return Todo;
};
