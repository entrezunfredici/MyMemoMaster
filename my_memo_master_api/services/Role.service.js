const Role = require("../models/Role.model");
const { Op } = require("sequelize");

class RoleService {
    async findAll() {
        return await Role.findAll();
    }

    async findOne(id) {
        return await Role.findByPk(id);
    }

    async create(data) {
        return await Role.create(data);
    }
}

module.exports = new RoleService();