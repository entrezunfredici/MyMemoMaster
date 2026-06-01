"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("LeitnerSystemsUsers", {
      idUser: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: "User",
          key: "userId",
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
      writeRight: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      shareRight: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      shareWithWriteRightRight: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      shareWithAllRights: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("LeitnerSystemsUsers");
  },
};
