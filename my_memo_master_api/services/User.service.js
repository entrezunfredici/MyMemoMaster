const { User } = require("../models/index");
const bcrypt = require('bcrypt');

class UserService {

  async findAll() {
    const users = await User.findAll();
    users.forEach(user => {
      delete user.dataValues.password;
    });
    return users;
  }

  async findByEmail(email) {
    const user = await User.findOne({
      where: { email: email }
    });
    if (user) {
      delete user.dataValues.password;
    }
    return user;
  }

  async findOne(userId) {
    const user = await User.findByPk(userId);
    if (user) {
      delete user.dataValues.password;
    }
    return user;
  }

  async create(user) {
    user.password = await bcrypt.hash(user.password, 10);
    await User.create(user);
    return this.findOne(userId);
  }

  async update(userId, user) {
    await User.update(user, {
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

  async updateLoginDate(userId) {
    await User.update({ lastLogin: new Date() }, {
      where: { userId: userId }
    });
  }

  async verifyPassword(userId, password) {
    const user = await User.findByPk(userId);
    return await bcrypt.compare(password, user.password);
  }

  async setPassword(userId, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.update({ password: hashedPassword }, {
      where: { userId: userId }
    });
  }
}

module.exports = new UserService();
