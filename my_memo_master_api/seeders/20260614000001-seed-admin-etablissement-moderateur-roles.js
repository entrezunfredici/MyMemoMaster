'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date()
    await queryInterface.bulkInsert(
      'Role',
      [
        { roleId: 4, name: 'Admin établissement', createdAt: now, updatedAt: now },
        { roleId: 5, name: 'Modérateur', createdAt: now, updatedAt: now }
      ],
      { ignoreDuplicates: true }
    )
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('Role', { roleId: [4, 5] })
  }
}
