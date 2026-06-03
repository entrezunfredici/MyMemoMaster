"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("LeitnerCard", "next_review_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("LeitnerCard", "last_review_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("LeitnerCard", "review_count", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn("LeitnerCard", "correct_count", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn("LeitnerCard", "incorrect_count", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("LeitnerCard", "next_review_at");
    await queryInterface.removeColumn("LeitnerCard", "last_review_at");
    await queryInterface.removeColumn("LeitnerCard", "review_count");
    await queryInterface.removeColumn("LeitnerCard", "correct_count");
    await queryInterface.removeColumn("LeitnerCard", "incorrect_count");
  },
};
