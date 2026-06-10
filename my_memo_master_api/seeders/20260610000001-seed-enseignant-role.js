"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      "Role",
      [{ roleId: 3, name: "Enseignant", createdAt: now, updatedAt: now }],
      { ignoreDuplicates: true }
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("Role", { roleId: [3] });
  },
};
