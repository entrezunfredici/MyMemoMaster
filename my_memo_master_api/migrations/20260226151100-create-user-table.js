"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("User", {
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      roleId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "Role",
          key: "roleId",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      validEmailCode: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      resetPasswordCode: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      hasValidatedEmail: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      lastLogin: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("User");
  },
};
