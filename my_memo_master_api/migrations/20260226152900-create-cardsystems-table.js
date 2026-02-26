"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("cardSystems", {
      idCard: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: "LeitnerCard",
          key: "idCard",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      idSystem: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: "LeitnerSystem",
          key: "idSystem",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("cardSystems");
  },
};
