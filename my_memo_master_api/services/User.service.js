const { User, Role } = require("../models/index");
const bcrypt = require('bcryptjs');
const generateCode = require('../helpers/generateCode')

class UserService {

  async findAll() {
    const users = await User.findAll();
    return users.map(user => {
      const { password, ...userWithoutPassword } = user?.dataValues || user;
      return userWithoutPassword;
    });
  }

  async findByEmail(email) {
    const user = await User.findOne({
      where: { email },
    });
    if (!user) return null;
    const { password, ...userWithoutPassword } = user?.dataValues || user;
    return userWithoutPassword;
  }

  async findOne(userId) {
    const user = await User.findByPk(userId);
    if (!user) return null;
    const { password, ...userWithoutPassword } = user?.dataValues || user;
    return userWithoutPassword;
  }

  async create(user) {
    if (await this.findByEmail(user.email)) throw new Error('Email déjà utilisé');
    if (!user.name || !user.password || !user.email) throw new Error('Champs manquants');

    user.password = await bcrypt.hash(user.password, 10);

    const newUser = await User.create(user);
    if (!newUser) throw new Error('Erreur lors de la création de l\'utilisateur');

    const { password, ...userWithoutPassword } = newUser?.dataValues || newUser;
    return userWithoutPassword;
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

  async setRole(userId, roleId) {
    if (!await Role.findByPk(roleId)) throw new Error('Le rôle n\'existe pas');

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
    if (!password) throw new Error('Mot de passe manquant');
    if (password.length < 10) throw new Error('Le mot de passe doit contenir au moins 10 caractères');

    const hashedPassword = await bcrypt.hash(password, 10);
    if (bcrypt.compare(password, hashedPassword)) throw new Error('Le mot de passe doit être différent de l\'ancien');

    await User.update({ password: hashedPassword }, {
      where: { userId: userId }
    });
  }

  async setValidEmailCode(userId, code = '') {
    if (!code) code = generateCode();
    await User.update({ validEmailCode: code }, {
      where: { userId: userId }
    });
  }

  async verifyValidEmailCode(userId, code) {
    const user = await User.findByPk(userId);
    const isValid = user.validEmailCode === code;
    user.validEmailCode = null;
    await user.save();
    return isValid;
  }

  async clearValidEmailCode(userId) {
    await User.update({ validEmailCode: null }, {
      where: { userId: userId }
    });
  }

  async setResetPasswordCode(userId, code = '') {
    if (!code) code = generateCode();
    await User.update({ resetPasswordCode: code }, {
      where: { userId: userId }
    });
  }

  async verifyResetPasswordCode(userId, code) {
    const user = await User.findByPk(userId);
    const isValid = user.resetPasswordCode === code;
    user.resetPasswordCode = null;
    await user.save();
    return isValid;
  }

  async clearResetPasswordCode(userId) {
    await User.update({ resetPasswordCode: null }, {
      where: { userId: userId }
    });
  }

  async clearAllCodes(userId) {
    await this.clearValidEmailCode(userId);
    await this.clearResetPasswordCode(userId);
  }
}

module.exports = new UserService();
