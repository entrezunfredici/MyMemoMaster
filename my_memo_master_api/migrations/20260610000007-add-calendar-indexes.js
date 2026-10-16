'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex('ClassGroup', ['createdBy'], { name: 'idx_classgroup_createdby' })
    await queryInterface.addIndex('CalendarEvent', ['classGroupId'], {
      name: 'idx_calendarevent_classgroupid'
    })
    await queryInterface.addIndex('CalendarEvent', ['createdBy'], {
      name: 'idx_calendarevent_createdby'
    })
    await queryInterface.addIndex('EventOccurrence', ['eventId'], {
      name: 'idx_eventoccurrence_eventid'
    })
    await queryInterface.addIndex('EventOccurrence', ['date'], { name: 'idx_eventoccurrence_date' })
    await queryInterface.addIndex('Deadline', ['occurrenceId'], {
      name: 'idx_deadline_occurrenceid'
    })
    await queryInterface.addIndex('Deadline', ['createdBy'], { name: 'idx_deadline_createdby' })
    await queryInterface.addIndex('Deadline', ['dueDate'], { name: 'idx_deadline_duedate' })
    await queryInterface.addIndex('RevisionSession', ['userId'], {
      name: 'idx_revisionsession_userid'
    })
    await queryInterface.addIndex('RevisionSession', ['date'], { name: 'idx_revisionsession_date' })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('ClassGroup', 'idx_classgroup_createdby')
    await queryInterface.removeIndex('CalendarEvent', 'idx_calendarevent_classgroupid')
    await queryInterface.removeIndex('CalendarEvent', 'idx_calendarevent_createdby')
    await queryInterface.removeIndex('EventOccurrence', 'idx_eventoccurrence_eventid')
    await queryInterface.removeIndex('EventOccurrence', 'idx_eventoccurrence_date')
    await queryInterface.removeIndex('Deadline', 'idx_deadline_occurrenceid')
    await queryInterface.removeIndex('Deadline', 'idx_deadline_createdby')
    await queryInterface.removeIndex('Deadline', 'idx_deadline_duedate')
    await queryInterface.removeIndex('RevisionSession', 'idx_revisionsession_userid')
    await queryInterface.removeIndex('RevisionSession', 'idx_revisionsession_date')
  }
}
