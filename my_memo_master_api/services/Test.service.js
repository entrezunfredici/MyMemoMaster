const { Test } = require("../models/index");

class TestService {
    async findAll() {
        return await Test.findAll();
    }
    async findOne(id) {
        return await Test.findByPk(id);
    }
    async create(data) {
        return await Test.create(data);
    }
    async update(id,data) {
        const test = await Test.findByPk(id);
        if (!test) {
            throw new Error("Test not found");
        }
        return await test.update(data);
    }
    async delete(id) {
        const test = await Test.findByPk(id);
        if (!test) {
            throw new Error("Test not found");
        }
        return await test.destroy();
    }
}

module.exports = new TestService();