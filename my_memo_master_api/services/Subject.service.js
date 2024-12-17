const { Subject } = require("../models/index");
const { Op } = require("sequelize");

class SubjectService {

    async findAll() {
        const subjects = await Subject.findAll();
        return subjects;
    }

    async findOne(subjectId) {
        const subject = await Subject.findByPk(subjectId);
        return subject;
    }

    async create(data) {
        await Subject.create(data);
        return this.findOne(subjectId);
    }

    async update(subjectId, data) {
        await Subject.update(data, {
            where: { subjectId: subjectId }
        });
        return this.findOne(subjectId);
    }

    async delete(subjectId) {
        await Subject.destroy({
            where: { subjectId: subjectId }
        });
    }

}

module.exports = new SubjectService();
