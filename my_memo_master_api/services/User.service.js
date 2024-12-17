const { User } = require("../models/index");
const { Op } = require("sequelize");

class UserService {

  async findAll() {
    const users = await User.findAll();
    users.forEach(user => {
      delete user.dataValues.password;
    });
    return users;
  }

  async findOne(userId) {
    const user = await User.findByPk(userId);
    if (user) {
      delete user.dataValues.password;
    }
    return user;
  }

  async create(data) {
    await User.create(data);
    return this.findOne(userId);
  }

  async update(userId, data) {
    await User.update(data, {
      where: { userId: userId }
    });
    return this.findOne(userId);
  }

  async delete(userId) {
    await User.destroy({
      where: { userId: userId }
    });
  }

  async updateRole(userId, roleId) {
    await User.update({ roleId: roleId }, {
      where: { userId: userId }
    });
    return this.findOne(userId);
  }

  async deleteRole(userId) {
    await User.update({ roleId: null }, {
      where: { userId: userId }
    });
    return this.findOne(userId);
  }
}

module.exports = new UserService();
