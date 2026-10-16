'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex('User', ['roleId'], { name: 'idx_user_roleid' })
    await queryInterface.addIndex('LeitnerSystem', ['idUser'], { name: 'idx_leitnersystem_iduser' })
    await queryInterface.addIndex('LeitnerBox', ['idSystem'], { name: 'idx_leitnerbox_idsystem' })
    await queryInterface.addIndex('LeitnerCard', ['idQuestion'], {
      name: 'idx_leitnercard_idquestion'
    })
    await queryInterface.addIndex('LeitnerCard', ['idBox'], { name: 'idx_leitnercard_idbox' })
    await queryInterface.addIndex('LeitnerCard', ['next_review_at'], {
      name: 'idx_leitnercard_next_review_at'
    })
    await queryInterface.addIndex('Response', ['idQuestion'], { name: 'idx_response_idquestion' })
    await queryInterface.addIndex('Fields', ['idType'], { name: 'idx_fields_idtype' })
    await queryInterface.addIndex('Fields', ['idUnit'], { name: 'idx_fields_idunit' })
    await queryInterface.addIndex('MindMap', ['userId'], { name: 'idx_mindmap_userid' })
    await queryInterface.addIndex('MindMap', ['subjectId'], { name: 'idx_mindmap_subjectid' })
    await queryInterface.addIndex('Test', ['subjectId'], { name: 'idx_test_subjectid' })
    await queryInterface.addIndex('Tutorials', ['subjectId'], { name: 'idx_tutorials_subjectid' })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('User', 'idx_user_roleid')
    await queryInterface.removeIndex('LeitnerSystem', 'idx_leitnersystem_iduser')
    await queryInterface.removeIndex('LeitnerBox', 'idx_leitnerbox_idsystem')
    await queryInterface.removeIndex('LeitnerCard', 'idx_leitnercard_idquestion')
    await queryInterface.removeIndex('LeitnerCard', 'idx_leitnercard_idbox')
    await queryInterface.removeIndex('LeitnerCard', 'idx_leitnercard_next_review_at')
    await queryInterface.removeIndex('Response', 'idx_response_idquestion')
    await queryInterface.removeIndex('Fields', 'idx_fields_idtype')
    await queryInterface.removeIndex('Fields', 'idx_fields_idunit')
    await queryInterface.removeIndex('MindMap', 'idx_mindmap_userid')
    await queryInterface.removeIndex('MindMap', 'idx_mindmap_subjectid')
    await queryInterface.removeIndex('Test', 'idx_test_subjectid')
    await queryInterface.removeIndex('Tutorials', 'idx_tutorials_subjectid')
  }
}
