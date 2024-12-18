const { Role } = require("../models/index");
const { Op } = require("sequelize");

class RoleService {

    async findAll() {
        const roles = await Role.findAll();
        return roles;
    }

    async findOne(roleId) {
        const role = await Role.findByPk(roleId);
        return role;
    }

    async create(data) {
        await Role.create(data);
        return this.findOne(roleId);
    }

    async update(roleId, data) {
        await Role.update(data, {
            where: { roleId: roleId }
        });
        return this.findOne(roleId);
    }

    async delete(roleId) {
        await Role.destroy({
            where: { roleId: roleId }
        });
    }
}

module.exports = new RoleService();
